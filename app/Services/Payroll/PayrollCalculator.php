<?php

namespace App\Services\Payroll;

use App\Enums\AdjustmentType;
use App\Enums\PayModel;
use App\Models\PayRate;
use App\Models\User;
use App\Models\WorkLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Internal payroll for one worker and one month (not the official Lohnabrechnung).
 *
 *   payable = hours × hourly rate + trips × per-trip rate + fixed + bonuses − deductions − advances
 *
 * - Hours: only time clocked on orders (work logs), counted in the month the log started.
 * - Trip: one per order, counted in the month the worker first clocked in on that order.
 * - The rate valid on the day of the work is used; all amounts in cents.
 */
class PayrollCalculator
{
    public function calculate(User $user, int $year, int $month, Collection $adjustments): array
    {
        $tz = $user->company?->timezone ?: config('app.display_timezone');
        [$from, $to] = self::monthRange($year, $month, $tz);
        $rates = $user->payRates()->get();

        $logs = WorkLog::where('user_id', $user->id)
            ->whereNotNull('ended_at')
            ->where('started_at', '>=', $from)
            ->where('started_at', '<', $to)
            ->get();

        // Hours, grouped by the rate that applied
        $seconds = 0;
        $unrated = 0;
        $hourGroups = [];
        foreach ($logs as $log) {
            $s = $log->seconds();
            $seconds += $s;
            $rate = self::rateOn($rates, $log->started_at->setTimezone($tz)->format('Y-m-d'));

            if (! $rate) {
                $unrated += $s;
            } elseif ($rate->model->paysHours()) {
                $hourGroups[$rate->hourly_cents] = ($hourGroups[$rate->hourly_cents] ?? 0) + $s;
            }
        }

        $hours = [];
        foreach ($hourGroups as $cents => $s) {
            $hours[] = ['rate_cents' => $cents, 'seconds' => $s, 'hours' => round($s / 3600, 2), 'amount_cents' => (int) round($s * $cents / 3600)];
        }

        // Trips: orders first worked on in this month
        $firstStarts = WorkLog::where('user_id', $user->id)
            ->selectRaw('order_id, MIN(started_at) as first_started_at')
            ->groupBy('order_id')
            ->havingRaw('MIN(started_at) >= ? AND MIN(started_at) < ?', [$from, $to])
            ->with('order:id,number')
            ->get();

        $tripGroups = [];
        foreach ($firstStarts as $row) {
            $date = CarbonImmutable::parse($row->first_started_at, 'UTC')->setTimezone($tz)->format('Y-m-d');
            $rate = self::rateOn($rates, $date);

            if ($rate && $rate->model->paysTrips()) {
                $key = $rate->per_job_cents;
                $tripGroups[$key] ??= ['rate_cents' => $key, 'count' => 0, 'amount_cents' => 0, 'orders' => []];
                $tripGroups[$key]['count']++;
                $tripGroups[$key]['amount_cents'] += $key;
                $tripGroups[$key]['orders'][] = $row->order?->number;
            }
        }

        // Fixed monthly amount: the rate valid on the last day of the month
        $lastDay = CarbonImmutable::create($year, $month, 1)->endOfMonth()->format('Y-m-d');
        $monthRate = self::rateOn($rates, $lastDay);
        $fixed = $monthRate?->model === PayModel::Fixed ? $monthRate->monthly_cents : 0;

        $sum = fn (AdjustmentType $type) => (int) $adjustments->where('type', $type)->sum('amount_cents');
        $bonus = $sum(AdjustmentType::Bonus);
        $deduction = $sum(AdjustmentType::Deduction);
        $advance = $sum(AdjustmentType::Advance);

        $hoursCents = array_sum(array_column($hours, 'amount_cents'));
        $tripsCents = array_sum(array_column($tripGroups, 'amount_cents'));
        $gross = $hoursCents + $tripsCents + $fixed + $bonus - $deduction;

        return [
            'hours' => round($seconds / 3600, 2),
            'trips' => $firstStarts->count(),
            'gross_cents' => $gross,
            'payable_cents' => $gross - $advance,
            'details' => [
                'model' => $monthRate?->model->value ?? $rates->last()?->model->value,
                'rate' => $monthRate ? [
                    'hourly_cents' => $monthRate->hourly_cents,
                    'per_job_cents' => $monthRate->per_job_cents,
                    'monthly_cents' => $monthRate->monthly_cents,
                ] : null,
                'seconds' => $seconds,
                'hour_groups' => $hours,
                'hours_cents' => $hoursCents,
                'trip_groups' => array_values($tripGroups),
                'trips_cents' => $tripsCents,
                'fixed_cents' => $fixed,
                'bonus_cents' => $bonus,
                'deduction_cents' => $deduction,
                'advance_cents' => $advance,
                'unrated_seconds' => $unrated,
            ],
        ];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} UTC bounds of a local calendar month */
    public static function monthRange(int $year, int $month, string $tz): array
    {
        $start = CarbonImmutable::create($year, $month, 1, 0, 0, 0, $tz);

        return [$start->utc(), $start->addMonth()->utc()];
    }

    public static function rateOn(Collection $rates, string $ymd): ?PayRate
    {
        return $rates->filter(fn (PayRate $r) => $r->coversDate($ymd))->sortByDesc('valid_from')->first();
    }
}
