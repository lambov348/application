<?php

namespace App\Services;

use App\Enums\Role;
use App\Jobs\SendPushNotification;
use App\Models\AppNotification;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

/**
 * Creates notifications (in the recipient's language) and queues their delivery.
 * The person who caused the event is never notified about it.
 */
class Notifier
{
    public function notify(User $user, string $type, array $data = []): ?AppNotification
    {
        if (! $user->is_active || $user->id === Auth::id()) {
            return null;
        }

        $notification = AppNotification::create([
            'user_id' => $user->id,
            'channel' => 'push',
            'type' => $type,
            'data' => $data,
            'locale' => $user->locale ?? $user->company?->default_locale ?? config('app.locale'),
        ]);

        SendPushNotification::dispatch($notification->id)->afterCommit();

        return $notification;
    }

    /** All workers on the order. */
    public function workersOf(Order $order, string $type, array $extra = []): void
    {
        foreach ($order->workers()->get() as $worker) {
            $this->notify($worker, $type, $this->orderData($order, $worker) + $extra);
        }
    }

    /** All owners of the order's company. */
    public function ownersOf(Order $order, string $type, array $extra = []): void
    {
        $owners = User::withoutGlobalScopes()
            ->where('company_id', $order->company_id)
            ->where('role', Role::Owner)
            ->whereNull('deleted_at')
            ->get();

        foreach ($owners as $owner) {
            $this->notify($owner, $type, $this->orderData($order, $owner) + $extra);
        }
    }

    public function orderData(Order $order, User $recipient): array
    {
        $order->loadMissing('address');

        return [
            'order_id' => $order->id,
            'number' => $order->number,
            'title' => $order->title,
            'when' => $order->date
                ? trim($order->date->format('d.m.Y').' '.($order->start_time ? substr($order->start_time, 0, 5) : ''))
                : '—',
            'address' => $order->address?->oneLine() ?? '—',
            'url' => $recipient->isOwner()
                ? route('admin.orders.show', $order, absolute: false)
                : route('worker.orders.show', $order, absolute: false),
        ];
    }
}
