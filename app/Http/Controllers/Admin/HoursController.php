<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Shift;
use App\Models\User;
use App\Models\WorkLog;
use App\Services\Audit;
use App\Services\Payroll\Payroll;
use App\Services\Payroll\PayrollCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Shifts and hours per order. Only the owner corrects them, always with a reason (audit_log).
 */
class HoursController extends Controller
{
    public function __construct(private Payroll $payroll) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $tz = $this->tz($request);
        $month = $this->month($request, $tz);
        [$from, $to] = PayrollCalculator::monthRange($month->year, $month->month, $tz);
        $workerId = $request->integer('worker') ?: null;

        $shifts = Shift::query()
            ->with(['user', 'workLogs' => fn ($q) => $q->orderBy('started_at'), 'workLogs.order'])
            ->where('started_at', '>=', $from)->where('started_at', '<', $to)
            ->when($workerId, fn ($q) => $q->where('user_id', $workerId))
            ->orderByDesc('needs_review')->orderByDesc('started_at')
            ->get();

        $period = $this->payroll->period($request->user()->company_id, $month->year, $month->month);

        return Inertia::render('Admin/Hours/Index', [
            'month' => $month->format('Y-m'),
            'closed' => $period->isClosed(),
            'worker' => $workerId,
            'workers' => User::workers()->orderBy('name')->get(['id', 'name']),
            'orders' => Order::whereNotIn('status', ['rejected'])->latest('id')->limit(200)->get(['id', 'number', 'title']),
            'shifts' => $shifts->map(fn (Shift $s) => [
                'id' => $s->id,
                'worker' => $s->user->name,
                'worker_id' => $s->user_id,
                'started_at' => $s->started_at->toIso8601String(),
                'ended_at' => $s->ended_at?->toIso8601String(),
                'auto_closed' => $s->auto_closed,
                'needs_review' => $s->needs_review,
                'seconds' => $s->workLogs->sum(fn (WorkLog $l) => $l->seconds()),
                'logs' => $s->workLogs->map(fn (WorkLog $l) => [
                    'id' => $l->id,
                    'order' => $l->order ? "#{$l->order->number} {$l->order->title}" : '—',
                    'order_id' => $l->order_id,
                    'started_at' => $l->started_at->toIso8601String(),
                    'ended_at' => $l->ended_at?->toIso8601String(),
                    'seconds' => $l->seconds(),
                ]),
            ]),
        ]);
    }

    public function updateLog(Request $request, WorkLog $log): RedirectResponse
    {
        $this->authorizeLog($request, $log);
        $data = $this->validateTimes($request);
        [$start, $end] = $this->times($request, $data);
        $this->guardOpen($request, $log->started_at, $start);

        $before = $this->snapshot($log);
        $log->update(['started_at' => $start, 'ended_at' => $end]);
        Audit::record($log, 'hours_corrected', $before, $this->snapshot($log), $data['reason']);

        return back()->with('success', __('app.saved'));
    }

    /** Add time a worker forgot to clock. */
    public function storeLog(Request $request): RedirectResponse
    {
        Gate::authorize('viewAny', User::class);
        $companyId = $request->user()->company_id;

        $data = $this->validateTimes($request, [
            'user_id' => ['required', Rule::exists('users', 'id')->where('company_id', $companyId)->where('role', 'worker')],
            'order_id' => ['required', Rule::exists('orders', 'id')->where('company_id', $companyId)->whereNull('deleted_at')],
        ]);
        [$start, $end] = $this->times($request, $data);
        $this->guardOpen($request, $start);

        DB::transaction(function () use ($data, $start, $end, $companyId) {
            $shift = Shift::where('user_id', $data['user_id'])
                ->where('started_at', '<=', $start)
                ->where(fn ($q) => $q->whereNull('ended_at')->orWhere('ended_at', '>=', $end))
                ->first();

            if (! $shift) {
                $shift = new Shift(['user_id' => $data['user_id'], 'started_at' => $start, 'ended_at' => $end]);
                $shift->company_id = $companyId;
                $shift->save();
            }

            $log = WorkLog::create([
                'shift_id' => $shift->id, 'order_id' => $data['order_id'], 'user_id' => $data['user_id'],
                'started_at' => $start, 'ended_at' => $end,
            ]);
            Audit::record($log, 'hours_added', after: $this->snapshot($log), reason: $data['reason']);
        });

        return back()->with('success', __('app.saved'));
    }

    public function destroyLog(Request $request, WorkLog $log): RedirectResponse
    {
        $this->authorizeLog($request, $log);
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']], [], ['reason' => __('ui.hours.reason')]);
        $this->guardOpen($request, $log->started_at);

        $before = $this->snapshot($log);
        $log->delete();
        Audit::record($log, 'hours_deleted', $before, reason: $data['reason']);

        return back()->with('success', __('app.deleted'));
    }

    public function updateShift(Request $request, Shift $shift): RedirectResponse
    {
        Gate::authorize('viewAny', User::class);
        $data = $this->validateTimes($request);
        [$start, $end] = $this->times($request, $data);
        $this->guardOpen($request, $shift->started_at, $start);

        $before = $shift->only(['started_at', 'ended_at', 'needs_review']);
        $shift->forceFill(['started_at' => $start, 'ended_at' => $end, 'needs_review' => false])->save();
        Audit::record($shift, 'shift_corrected', $before, $shift->only(['started_at', 'ended_at', 'needs_review']), $data['reason']);

        return back()->with('success', __('app.saved'));
    }

    /** Owner looked at an auto-closed shift and it is fine. */
    public function reviewShift(Request $request, Shift $shift): RedirectResponse
    {
        Gate::authorize('viewAny', User::class);

        $shift->forceFill(['needs_review' => false])->save();
        Audit::record($shift, 'shift_reviewed', ['needs_review' => true], ['needs_review' => false]);

        return back();
    }

    private function authorizeLog(Request $request, WorkLog $log): void
    {
        Gate::authorize('viewAny', User::class);
        // WorkLog has no company column: check through its shift.
        abort_unless(Shift::whereKey($log->shift_id)->exists(), 404);
    }

    private function validateTimes(Request $request, array $extra = []): array
    {
        return $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'start' => ['required', 'date_format:H:i'],
            'end' => ['required', 'date_format:H:i'],
            'reason' => ['required', 'string', 'max:500'],
            ...$extra,
        ], [], [
            'date' => __('ui.hours.date'), 'start' => __('ui.hours.start'), 'end' => __('ui.hours.end'),
            'reason' => __('ui.hours.reason'), 'user_id' => __('ui.hours.worker'), 'order_id' => __('ui.hours.order'),
        ]);
    }

    /** Local date and times → UTC; an end before the start means past midnight. */
    private function times(Request $request, array $data): array
    {
        $tz = $this->tz($request);
        $start = CarbonImmutable::parse("{$data['date']} {$data['start']}", $tz)->utc();
        $end = CarbonImmutable::parse("{$data['date']} {$data['end']}", $tz)->utc();

        if ($end->lessThanOrEqualTo($start)) {
            $end = $end->addDay();
        }
        if ($end->diffInHours($start, true) > 16) {
            throw ValidationException::withMessages(['end' => __('app.payroll.errors.too_long')]);
        }

        return [$start, $end];
    }

    private function guardOpen(Request $request, CarbonImmutable|\DateTimeInterface ...$moments): void
    {
        foreach ($moments as $moment) {
            $this->payroll->ensureOpenAt($request->user()->company_id, CarbonImmutable::instance($moment), $this->tz($request));
        }
    }

    private function snapshot(WorkLog $log): array
    {
        return [
            'user_id' => $log->user_id,
            'order_id' => $log->order_id,
            'started_at' => $log->started_at?->toIso8601String(),
            'ended_at' => $log->ended_at?->toIso8601String(),
        ];
    }

    private function tz(Request $request): string
    {
        return $request->user()->company->timezone ?: config('app.display_timezone');
    }

    private function month(Request $request, string $tz): CarbonImmutable
    {
        $value = (string) $request->string('month');

        return preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value)
            ? CarbonImmutable::createFromFormat('Y-m-d', "{$value}-01", $tz)->startOfDay()
            : CarbonImmutable::now($tz)->startOfMonth();
    }
}
