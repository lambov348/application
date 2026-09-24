<?php

namespace App\Services\Payroll;

use App\Enums\Role;
use App\Models\PayrollPeriod;
use App\Models\PayrollResult;
use App\Models\User;
use App\Models\WorkLog;
use App\Services\Audit;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Payroll
{
    public function __construct(private PayrollCalculator $calculator) {}

    public function period(int $companyId, int $year, int $month): PayrollPeriod
    {
        return PayrollPeriod::withoutGlobalScopes()->firstOrCreate(
            ['company_id' => $companyId, 'year' => $year, 'month' => $month],
            ['status' => 'open'],
        );
    }

    /** Is the month containing this moment (company time) already closed? */
    public function isClosedAt(int $companyId, CarbonInterface $moment, string $tz): bool
    {
        $local = $moment->copy()->setTimezone($tz);

        return PayrollPeriod::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('year', $local->year)
            ->where('month', $local->month)
            ->where('status', 'closed')
            ->exists();
    }

    public function ensureOpenAt(int $companyId, CarbonInterface $moment, string $tz): void
    {
        if ($this->isClosedAt($companyId, $moment, $tz)) {
            throw ValidationException::withMessages(['period' => __('app.payroll.errors.month_closed')]);
        }
    }

    /**
     * One row per worker: frozen results for a closed month, a live calculation otherwise.
     *
     * @return Collection<int, array>
     */
    public function rows(PayrollPeriod $period): Collection
    {
        if ($period->isClosed()) {
            return $period->results()->with('user')->get()->map(fn (PayrollResult $r) => [
                'user' => $r->user,
                'hours' => $r->hours,
                'trips' => $r->trips,
                'gross_cents' => $r->gross_cents,
                'payable_cents' => $r->payable_cents,
                'details' => $r->details,
            ])->sortBy(fn ($row) => $row['user']->name)->values();
        }

        $adjustments = $period->adjustments()->get()->groupBy('user_id');

        return $this->workers($period)->map(fn (User $u) => [
            'user' => $u,
            ...$this->calculator->calculate($u, $period->year, $period->month, $adjustments->get($u->id, collect())),
        ])->values();
    }

    /** Freeze the month. Afterwards hours, rates and adjustments of this month cannot change. */
    public function close(PayrollPeriod $period): void
    {
        DB::transaction(function () use ($period) {
            $period = PayrollPeriod::withoutGlobalScopes()->lockForUpdate()->findOrFail($period->id);

            if ($period->isClosed()) {
                throw ValidationException::withMessages(['period' => __('app.payroll.errors.month_closed')]);
            }

            foreach ($this->rows($period) as $row) {
                PayrollResult::create([
                    'period_id' => $period->id,
                    'user_id' => $row['user']->id,
                    'hours' => $row['hours'],
                    'trips' => $row['trips'],
                    'gross_cents' => $row['gross_cents'],
                    'payable_cents' => $row['payable_cents'],
                    'details' => $row['details'],
                ]);
            }

            $period->forceFill(['status' => 'closed', 'closed_at' => now(), 'closed_by' => Auth::id()])->save();
            Audit::record($period, 'closed', after: ['year' => $period->year, 'month' => $period->month]);
        });
    }

    /** Active workers plus anyone with hours or adjustments in the month. */
    private function workers(PayrollPeriod $period): Collection
    {
        $tz = $period->company?->timezone ?: config('app.display_timezone');
        [$from, $to] = PayrollCalculator::monthRange($period->year, $period->month, $tz);

        $withLogs = WorkLog::whereBetween('started_at', [$from, $to])->distinct()->pluck('user_id');
        $withAdjustments = $period->adjustments()->distinct()->pluck('user_id');

        return User::withTrashed()
            ->where('company_id', $period->company_id)
            ->where('role', Role::Worker)
            ->where(fn ($q) => $q
                ->where(fn ($a) => $a->where('is_active', true)->whereNull('deleted_at'))
                ->orWhereIn('id', $withLogs)
                ->orWhereIn('id', $withAdjustments))
            ->with('company')
            ->orderBy('name')
            ->get();
    }
}
