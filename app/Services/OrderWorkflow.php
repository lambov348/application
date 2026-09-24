<?php

namespace App\Services;

use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Validation\ValidationException;

/**
 * The only place where an order changes its status.
 */
class OrderWorkflow
{
    public const MIN_AFTER_PHOTOS = 2;

    public function transition(Order $order, OrderStatus $to, ?string $reason = null): void
    {
        if (! $order->status->canMoveTo($to)) {
            throw ValidationException::withMessages([
                'status' => __('app.orders.errors.transition_not_allowed'),
            ]);
        }

        if ($to === OrderStatus::Rejected) {
            if (trim((string) $reason) === '') {
                throw ValidationException::withMessages(['reason' => __('app.orders.errors.reason_required')]);
            }
            $order->reject_reason = trim($reason);
        }

        if ($to === OrderStatus::Completed) {
            $afterPhotos = $order->files()->where('kind', OrderFileKind::After)->count();

            if ($afterPhotos < self::MIN_AFTER_PHOTOS) {
                throw ValidationException::withMessages([
                    'status' => __('app.orders.errors.after_photos_required', ['count' => self::MIN_AFTER_PHOTOS]),
                ]);
            }
            $order->completed_at = now();
        }

        if ($to === OrderStatus::Paid) {
            $order->payment_status = PaymentStatus::Paid;
            $order->paid_at = now();
        }

        $order->status = $to;
        $order->save();
    }
}
