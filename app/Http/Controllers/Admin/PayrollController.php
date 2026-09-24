<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdjustmentType;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PayrollAdjustment;
use App\Models\PayrollPeriod;
use App\Models\User;
use App\Services\Audit;
use App\Services\Payroll\Payroll;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function __construct(private Payroll $payroll) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $tz = $request->user()->company->timezone ?: config('app.display_timezone');
        $value = (string) $request->string('month');
        $month = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value)
            ? CarbonImmutable::createFromFormat('Y-m-d', "{$value}-01", $tz)
            : CarbonImmutable::now($tz)->startOfMonth();

        $period = $this->payroll->period($request->user()->company_id, $month->year, $month->month);
        $rows = $this->payroll->rows($period);
        $previous = PayrollPeriod::where('status', 'closed')
            ->where(fn ($q) => $q->where('year', '<', $period->year)->orWhere(fn ($w) => $w->where('year', $period->year)->where('month', '<', $period->month)))
            ->orderByDesc('year')->orderByDesc('month')->first();

        return Inertia::render('Admin/Payroll/Index', [
            'month' => $month->format('Y-m'),
            'period' => [
                'id' => $period->id,
                'closed' => $period->isClosed(),
                'closed_at' => $period->closed_at?->toIso8601String(),
            ],
            'previous_closed' => $previous ? [
                'month' => sprintf('%04d-%02d', $previous->year, $previous->month),
                'closed_at' => $previous->closed_at?->toIso8601String(),
            ] : null,
            'rows' => $rows->map(fn (array $r) => [
                'user_id' => $r['user']->id,
                'name' => $r['user']->name,
                'hours' => $r['hours'],
                'trips' => $r['trips'],
                'gross_cents' => $r['gross_cents'],
                'payable_cents' => $r['payable_cents'],
                'details' => $r['details'],
            ]),
            'totals' => [
                'hours' => round($rows->sum('hours'), 2),
                'trips' => $rows->sum('trips'),
                'gross_cents' => $rows->sum('gross_cents'),
                'advance_cents' => $rows->sum(fn ($r) => $r['details']['advance_cents']),
                'payable_cents' => $rows->sum('payable_cents'),
                'adjust_cents' => $rows->sum(fn ($r) => $r['details']['bonus_cents'] - $r['details']['deduction_cents']),
            ],
            'adjustments' => $period->adjustments()->with(['user', 'author'])->latest()->get()->map(fn (PayrollAdjustment $a) => [
                'id' => $a->id,
                'user_id' => $a->user_id,
                'worker' => $a->user->name,
                'type' => $a->type->value,
                'amount_cents' => $a->amount_cents,
                'reason' => $a->reason,
                'author' => $a->author->name,
                'created_at' => $a->created_at->toIso8601String(),
            ]),
            'log' => AuditLog::query()
                ->where(fn ($q) => $q
                    ->where(fn ($p) => $p->where('entity', 'payroll_periods')->where('entity_id', $period->id))
                    ->orWhere(fn ($p) => $p->where('entity', 'payroll_adjustments')->whereIn('entity_id', $period->adjustments()->withTrashed()->pluck('id')))
                    ->orWhere(fn ($p) => $p->whereIn('entity', ['work_logs', 'shifts'])->where('created_at', '>=', now()->subDays(62))))
                ->latest('created_at')->latest('id')->limit(30)->get()
                ->map(fn (AuditLog $l) => [
                    'id' => $l->id,
                    'entity' => $l->entity,
                    'action' => $l->action,
                    'before' => $l->before,
                    'after' => $l->after,
                    'reason' => $l->reason,
                    'user' => User::withTrashed()->find($l->user_id)?->name,
                    'created_at' => $l->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function storeAdjustment(Request $request, PayrollPeriod $period): RedirectResponse
    {
        Gate::authorize('viewAny', User::class);
        $this->ensureOpen($period);

        if (is_string($request->input('amount'))) {
            $request->merge(['amount' => str_replace([' ', ','], ['', '.'], $request->input('amount'))]);
        }

        $data = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')->where('company_id', $request->user()->company_id)->where('role', 'worker')],
            'type' => ['required', Rule::enum(AdjustmentType::class)],
            'amount' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:100000'],
            'reason' => ['required', 'string', 'max:500'],
        ], [], [
            'user_id' => __('ui.hours.worker'), 'type' => __('ui.payroll.adjustment_type'),
            'amount' => __('ui.payroll.amount'), 'reason' => __('ui.hours.reason'),
        ]);

        $adjustment = $period->adjustments()->create([
            'user_id' => $data['user_id'],
            'type' => $data['type'],
            'amount_cents' => Money::toCents($data['amount']),
            'reason' => $data['reason'],
            'created_by' => $request->user()->id,
        ]);
        Audit::record($adjustment, 'created', after: $adjustment->only(['user_id', 'type', 'amount_cents']), reason: $data['reason']);

        return back()->with('success', __('app.saved'));
    }

    public function destroyAdjustment(PayrollAdjustment $adjustment): RedirectResponse
    {
        Gate::authorize('viewAny', User::class);
        $period = PayrollPeriod::find($adjustment->period_id) ?? abort(404);
        $this->ensureOpen($period);

        $adjustment->delete();
        Audit::record($adjustment, 'deleted', $adjustment->only(['user_id', 'type', 'amount_cents', 'reason']));

        return back()->with('success', __('app.deleted'));
    }

    public function close(PayrollPeriod $period): RedirectResponse
    {
        Gate::authorize('viewAny', User::class);
        $this->payroll->close($period);

        return back()->with('success', __('app.payroll.closed'));
    }

    private function ensureOpen(PayrollPeriod $period): void
    {
        if ($period->isClosed()) {
            throw ValidationException::withMessages(['period' => __('app.payroll.errors.month_closed')]);
        }
    }
}
