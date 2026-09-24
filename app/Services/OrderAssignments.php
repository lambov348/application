<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class OrderAssignments
{
    /**
     * Replace the order's workers and record who was added or removed.
     *
     * @param  list<int>  $userIds  ids of active workers of the order's company
     */
    public function sync(Order $order, array $userIds): void
    {
        $result = $order->workers()->sync($userIds);

        foreach (['attached' => 'worker_assigned', 'detached' => 'worker_unassigned'] as $key => $type) {
            foreach (User::withTrashed()->whereKey($result[$key])->get() as $user) {
                $order->events()->create([
                    'user_id' => Auth::id(),
                    'type' => $type,
                    'data' => ['worker_id' => $user->id, 'worker' => $user->name],
                ]);
            }
        }
    }
}
