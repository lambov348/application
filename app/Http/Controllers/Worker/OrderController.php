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
            ->whereNotIn('status', [OrderStatus::Rejected, OrderStatus::Paid])
            ->orderByRaw('date IS NULL, date, start_time')
            ->get();

        return Inertia::render('Worker/Orders/Index', [
            'orders' => $orders->map(fn (Order $o) => OrderPresenter::listItem($o, $user))->values(),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('view', $order);

        $order->load(['client', 'address', 'workers']);

        return Inertia::render('Worker/Orders/Show', [
            'order' => OrderPresenter::detail($order, $request->user()),
        ]);
    }
}
