<?php

namespace App\Support;

use App\Models\Address;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\User;

/**
 * Turns orders into arrays for the pages. Money fields are only included
 * for users allowed to see them, so a worker's browser never receives them.
 */
class OrderPresenter
{
    public static function listItem(Order $order, User $viewer): array
    {
        return [
            'id' => $order->id,
            'number' => $order->number,
            'title' => $order->title,
            'status' => $order->status->value,
            'date' => $order->date?->format('Y-m-d'),
            'start_time' => self::time($order->start_time),
            'end_time' => self::time($order->end_time),
            'client' => $order->client?->name,
            'address' => $order->address?->oneLine(),
            'workers' => $order->workers->map(fn (User $u) => $u->name)->values(),
            ...($viewer->can('viewMoney', $order) ? [
                'price_cents' => $order->price_cents,
                'payment_status' => $order->payment_status->value,
            ] : []),
        ];
    }

    public static function detail(Order $order, User $viewer): array
    {
        $data = [
            ...self::listItem($order, $viewer),
            'description' => $order->description,
            'client' => [
                'id' => $order->client->id,
                'name' => $order->client->name,
                'phone' => $order->client->phone,
            ],
            'address' => $order->address ? self::address($order->address) : null,
            'workers' => $order->workers->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'phone' => $u->phone,
                'accepted_at' => $u->pivot->accepted_at,
            ])->values(),
            'reject_reason' => $order->reject_reason,
            'completed_at' => $order->completed_at?->toIso8601String(),
        ];

        if ($viewer->can('viewMoney', $order)) {
            $data += [
                'client_email' => $order->client->email,
                'material_cents' => $order->material_cents,
                'source' => $order->source,
                'offer_no' => $order->offer_no,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'next_statuses' => array_map(fn ($s) => $s->value, $order->status->next()),
                'events' => $order->events->map(fn (OrderEvent $e) => [
                    'id' => $e->id,
                    'type' => $e->type,
                    'data' => $e->data,
                    'user' => $e->user?->name,
                    'created_at' => $e->created_at->toIso8601String(),
                ])->values(),
            ];
        }

        return $data;
    }

    public static function address(Address $address): array
    {
        return [
            'id' => $address->id,
            'street' => $address->street,
            'zip' => $address->zip,
            'city' => $address->city,
            'floor' => $address->floor,
            'has_elevator' => $address->has_elevator,
            'parking_note' => $address->parking_note,
            'line' => $address->oneLine(),
        ];
    }

    private static function time(?string $time): ?string
    {
        return $time ? substr($time, 0, 5) : null;
    }
}
