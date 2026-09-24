<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // workers get a list limited to their own orders
    }

    public function view(User $user, Order $order): bool
    {
        if ($user->company_id !== $order->company_id) {
            return false;
        }

        return $user->isOwner() || $order->isAssignedTo($user);
    }

    /** Prices, material costs and payment state. */
    public function viewMoney(User $user, Order $order): bool
    {
        return $user->isOwner() && $user->company_id === $order->company_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner();
    }

    public function update(User $user, Order $order): bool
    {
        return $user->isOwner() && $user->company_id === $order->company_id;
    }

    public function changeStatus(User $user, Order $order): bool
    {
        return $this->update($user, $order);
    }

    public function delete(User $user, Order $order): bool
    {
        return $this->update($user, $order);
    }
}
