<?php

namespace App\Services\Payroll;

use App\Models\Order;
use App\Models\User;
use App\Models\WorkLog;

/**
 * Labour cost of one order, for "remains for the business":
 * hourly part = hours on the order × hourly rate, trip part = one trip × per-trip rate.
 * Fixed monthly pay is not attributed to single orders.
 */
class OrderCost
{
    public function laborCents(Order $order): int
    {
        $tz = config('app.display_timezone');
        $logs = WorkLog::where('order_id', $order->id)->with('user.payRates')->orderBy('started_at')->get();
        $total = 0;

        foreach ($logs->groupBy('user_id') as $userLogs) {
            /** @var User $user */
            $user = $userLogs->first()->user;
            $rates = $user->payRates;

            foreach ($userLogs as $log) {
                $rate = PayrollCalculator::rateOn($rates, $log->started_at->setTimezone($tz)->format('Y-m-d'));
                if ($rate?->model->paysHours()) {
                    $total += (int) round($log->seconds() * $rate->hourly_cents / 3600);
                }
            }

            $first = PayrollCalculator::rateOn($rates, $userLogs->first()->started_at->setTimezone($tz)->format('Y-m-d'));
            if ($first?->model->paysTrips()) {
                $total += $first->per_job_cents;
            }
        }

        return $total;
    }
}
