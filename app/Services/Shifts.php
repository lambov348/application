<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Shift;
use App\Models\User;
use App\Models\WorkLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Shifts and the hours per order inside them. All times come from the server clock.
 */
class Shifts
{
    public function __construct(private OrderWorkflow $workflow) {}

    public function start(User $user): Shift
    {
        return DB::transaction(function () use ($user) {
            if ($user->shifts()->open()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages(['shift' => __('app.shifts.errors.already_open')]);
            }

            $shift = new Shift(['user_id' => $user->id, 'started_at' => now()]);
            $shift->company_id = $user->company_id;
            $shift->save();

            return $shift;
        });
    }

    public function end(User $user): Shift
    {
        return DB::transaction(function () use ($user) {
            $shift = $user->shifts()->open()->lockForUpdate()->first()
                ?? throw ValidationException::withMessages(['shift' => __('app.shifts.errors.not_open')]);

            $this->close($shift, now());

            return $shift;
        });
    }

    /** Start the clock on an order. Requires an open shift; switches away from another order. */
    public function startWork(User $user, Order $order): WorkLog
    {
        return DB::transaction(function () use ($user, $order) {
            $shift = $user->shifts()->open()->lockForUpdate()->first()
                ?? throw ValidationException::withMessages(['shift' => __('app.shifts.errors.start_shift_first')]);

            if (! in_array($order->status, [OrderStatus::Confirmed, OrderStatus::InProgress], true)) {
                throw ValidationException::withMessages(['status' => __('app.orders.errors.transition_not_allowed')]);
            }

            $current = $user->workLogs()->open()->first();
            if ($current?->order_id === $order->id) {
                return $current;
            }
            $current?->update(['ended_at' => now()]);

            if ($order->status === OrderStatus::Confirmed) {
                $this->workflow->transition($order, OrderStatus::InProgress);
            }

            return WorkLog::create([
                'shift_id' => $shift->id,
                'order_id' => $order->id,
                'user_id' => $user->id,
                'started_at' => now(),
            ]);
        });
    }

    public function stopWork(User $user): void
    {
        $user->workLogs()->open()->update(['ended_at' => now()]);
    }

    /**
     * Close shifts still open at 23:59 local time of the day they started.
     * Marked "needs review" so the owner checks the hours.
     */
    public function autoCloseDue(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();
        $closed = 0;

        Shift::withoutGlobalScopes()->open()->with('company')->chunkById(100, function ($shifts) use ($now, &$closed) {
            foreach ($shifts as $shift) {
                $tz = $shift->company->timezone ?: config('app.display_timezone');
                $deadline = CarbonImmutable::parse($shift->started_at)->setTimezone($tz)->setTime(23, 59);

                if ($now->greaterThanOrEqualTo($deadline)) {
                    DB::transaction(fn () => $this->close($shift, $deadline->utc(), auto: true));
                    $closed++;
                }
            }
        });

        return $closed;
    }

    private function close(Shift $shift, \DateTimeInterface $at, bool $auto = false): void
    {
        WorkLog::where('shift_id', $shift->id)->open()->update(['ended_at' => $at]);

        $shift->forceFill([
            'ended_at' => $at,
            'auto_closed' => $auto,
            'needs_review' => $auto,
        ])->save();
    }
}
