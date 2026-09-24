<?php

namespace App\Observers;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Notifier;
use Illuminate\Support\Facades\Auth;

/**
 * Every change to an order is written to order_events.
 */
class OrderObserver
{
    /** Fields that are covered by the status event or are purely technical. */
    private const NOTIFY_WORKERS = ['date', 'start_time', 'end_time', 'address_id'];

    private const IGNORED = ['updated_at', 'status', 'reject_reason', 'completed_at', 'paid_at'];

    public function created(Order $order): void
    {
        $this->log($order, 'created', ['number' => $order->number]);
    }

    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            $this->log($order, 'status_changed', array_filter([
                'from' => $order->getOriginal('status')?->value,
                'to' => $order->status->value,
                'reason' => $order->wasChanged('reject_reason') ? $order->reject_reason : null,
            ]));
        }

        $changes = [];
        foreach (array_keys($order->getChanges()) as $field) {
            if (! in_array($field, self::IGNORED, true)) {
                $changes[$field] = [$this->plain($order->getOriginal($field)), $this->plain($order->getAttribute($field))];
            }
        }

        if ($changes !== []) {
            $this->log($order, 'updated', ['changes' => $changes]);
        }

        // Workers must know when the appointment or the place changes.
        $open = in_array($order->status, [OrderStatus::New, OrderStatus::Scheduled, OrderStatus::Confirmed, OrderStatus::InProgress], true);
        if ($open && array_intersect(array_keys($changes), self::NOTIFY_WORKERS) !== []) {
            app(Notifier::class)->workersOf($order, 'order_changed');
        }
    }

    public function deleted(Order $order): void
    {
        $this->log($order, 'deleted');
    }

    private function log(Order $order, string $type, array $data = []): void
    {
        $order->events()->create([
            'user_id' => Auth::id(),
            'type' => $type,
            'data' => $data ?: null,
        ]);
    }

    private function plain(mixed $value): mixed
    {
        return match (true) {
            $value instanceof \BackedEnum => $value->value,
            $value instanceof \DateTimeInterface => $value->format('Y-m-d'),
            default => $value,
        };
    }
}
