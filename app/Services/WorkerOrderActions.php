<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * What a worker can do with an order assigned to them.
 */
class WorkerOrderActions
{
    public function __construct(private OrderWorkflow $workflow) {}

    /** Accepting a scheduled order makes it "confirmed". */
    public function accept(Order $order, User $worker): void
    {
        if (! in_array($order->status, [OrderStatus::Scheduled, OrderStatus::Confirmed, OrderStatus::InProgress], true)) {
            throw ValidationException::withMessages(['status' => __('app.orders.errors.transition_not_allowed')]);
        }

        DB::transaction(function () use ($order, $worker) {
            $order->workers()->updateExistingPivot($worker->id, ['accepted_at' => now(), 'declined_at' => null]);
            $order->logEvent('worker_accepted', ['worker_id' => $worker->id, 'worker' => $worker->name]);

            if ($order->status === OrderStatus::Scheduled) {
                $this->workflow->transition($order, OrderStatus::Confirmed);
            }
        });
    }

    public function decline(Order $order, User $worker): void
    {
        if (! in_array($order->status, [OrderStatus::New, OrderStatus::Scheduled, OrderStatus::Confirmed], true)) {
            throw ValidationException::withMessages(['status' => __('app.orders.errors.transition_not_allowed')]);
        }

        $order->workers()->updateExistingPivot($worker->id, ['declined_at' => now(), 'accepted_at' => null]);
        $order->logEvent('worker_declined', ['worker_id' => $worker->id, 'worker' => $worker->name]);
    }

    /** Needs at least 2 "after" photos (checked by the workflow). Stops all clocks on the order. */
    public function complete(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $this->workflow->transition($order, OrderStatus::Completed);
            WorkLog::where('order_id', $order->id)->open()->update(['ended_at' => now()]);
        });
    }
}
