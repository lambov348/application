<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderWorkflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class OrderStatusController extends Controller
{
    public function __invoke(Request $request, Order $order, OrderWorkflow $workflow): RedirectResponse
    {
        Gate::authorize('changeStatus', $order);

        $validated = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $workflow->transition($order, OrderStatus::from($validated['status']), $validated['reason'] ?? null);

        return back()->with('success', __('app.orders.status_changed'));
    }
}
