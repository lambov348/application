<?php

namespace App\Policies;

use App\Enums\OrderStatus;
use App\Models\OrderFile;
use App\Models\User;

class OrderFilePolicy
{
    public function view(User $user, OrderFile $file): bool
    {
        return $file->order !== null && $user->can('view', $file->order);
    }

    /** The owner always; a worker only their own photos while the order is still open. */
    public function delete(User $user, OrderFile $file): bool
    {
        $order = $file->order;

        if ($order === null) {
            return false;
        }

        if ($user->can('update', $order)) {
            return true;
        }

        return $file->uploaded_by === $user->id
            && $user->can('view', $order)
            && ! in_array($order->status, [OrderStatus::Completed, OrderStatus::Paid], true);
    }
}
