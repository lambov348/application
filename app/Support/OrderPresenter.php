<?php

namespace App\Support;

use App\Enums\OrderFileKind;
use App\Models\Address;
use App\Models\ChecklistItem;
use App\Models\Order;
use App\Models\OrderComment;
use App\Models\OrderEvent;
use App\Models\OrderFile;
use App\Models\User;
use App\Models\WorkLog;
use Illuminate\Support\Facades\URL;

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
                'declined_at' => $u->pivot->declined_at,
            ])->values(),
            'reject_reason' => $order->reject_reason,
            'completed_at' => $order->completed_at?->toIso8601String(),
            'checklist' => $order->checklist->map(fn (ChecklistItem $i) => [
                'id' => $i->id,
                'text' => $i->text,
                'done_at' => $i->done_at?->toIso8601String(),
                'done_by' => $i->doneBy?->name,
            ])->values(),
            'files' => $order->files->sortBy('id')->map(fn (OrderFile $f) => self::file($f, $viewer))->values(),
            'after_photos' => $order->files->where('kind', OrderFileKind::After)->count(),
            'comments' => $order->comments->map(fn (OrderComment $c) => [
                'id' => $c->id,
                'text' => $c->text,
                'user' => $c->user?->name,
                'mine' => $c->user_id === $viewer->id,
                'created_at' => $c->created_at->toIso8601String(),
            ])->values(),
        ];

        if ($viewer->isWorker()) {
            $mine = $order->workers->firstWhere('id', $viewer->id);
            $logs = $order->workLogs->where('user_id', $viewer->id);
            $open = $logs->firstWhere('ended_at', null);

            $data['me'] = [
                'accepted_at' => $mine?->pivot->accepted_at,
                'declined_at' => $mine?->pivot->declined_at,
                // finished time plus the running clock, which the page adds live
                'seconds' => $logs->whereNotNull('ended_at')->sum(fn (WorkLog $l) => $l->seconds()),
                'running_since' => $open?->started_at->toIso8601String(),
            ];
        }

        if ($viewer->can('viewMoney', $order)) {
            $data += [
                'client_email' => $order->client->email,
                'material_cents' => $order->material_cents,
                'source' => $order->source,
                'offer_no' => $order->offer_no,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'hours' => $order->workLogs->groupBy('user_id')->map(fn ($logs) => [
                    'worker' => $logs->first()->user?->name,
                    'seconds' => $logs->sum(fn (WorkLog $l) => $l->seconds()),
                    'running' => $logs->contains(fn (WorkLog $l) => $l->ended_at === null),
                ])->values(),
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

    public static function file(OrderFile $file, User $viewer): array
    {
        $expires = now()->addMinutes(30);
        $url = fn (array $extra = []) => URL::temporarySignedRoute('files.show', $expires, ['file' => $file->id, ...$extra], absolute: false);

        return [
            'id' => $file->id,
            'kind' => $file->kind->value,
            'name' => $file->original_name,
            'size' => $file->size_bytes,
            'is_image' => $file->isImage(),
            'url' => $url(),
            'preview_url' => $file->isImage() ? $url(['preview' => 1]) : null,
            'download_url' => $url(['download' => 1]),
            'uploaded_by' => $file->uploader?->name,
            'created_at' => $file->created_at->toIso8601String(),
            'can_delete' => $viewer->can('delete', $file),
        ];
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
