<?php

namespace App\Http\Controllers\Worker;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\OrderPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $orders = $user->orders()
            ->with(['client', 'address', 'workers'])
            ->whereNotIn('status', [OrderStatus::Rejected, OrderStatus::Completed, OrderStatus::Paid])
            ->orderByRaw('date IS NULL, date, start_time')
            ->get();

        $shift = $user->openShift();
        $current = $user->workLogs()->open()->with('order.address')->first();

        return Inertia::render('Worker/Orders/Index', [
            'orders' => $orders->map(fn (Order $o) => [
                ...OrderPresenter::listItem($o, $user),
                'accepted' => $o->pivot->accepted_at !== null,
                'declined' => $o->pivot->declined_at !== null,
            ])->values(),
            'shift' => $shift ? [
                'started_at' => $shift->started_at->toIso8601String(),
                'current' => $current ? [
                    'order_id' => $current->order_id,
                    'title' => $current->order->title,
                    'address' => $current->order->address?->oneLine(),
                ] : null,
            ] : null,
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('view', $order);

        $order->load(['client', 'address', 'workers', 'checklist.doneBy', 'files.uploader', 'files.order', 'comments.user', 'workLogs.user']);

        return Inertia::render('Worker/Orders/Show', [
            'order' => OrderPresenter::detail($order, $request->user()),
            'shift_open' => $request->user()->shifts()->open()->exists(),
        ]);
    }
}
