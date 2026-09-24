<?php

namespace App\Http\Controllers\Worker;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Shifts;
use App\Services\WorkerOrderActions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrderActionController extends Controller
{
    public function accept(Request $request, Order $order, WorkerOrderActions $actions): RedirectResponse
    {
        Gate::authorize('work', $order);
        $actions->accept($order, $request->user());

        return back()->with('success', __('app.worker.accepted'));
    }

    public function decline(Request $request, Order $order, WorkerOrderActions $actions): RedirectResponse
    {
        Gate::authorize('work', $order);
        $actions->decline($order, $request->user());

        return back()->with('success', __('app.worker.declined'));
    }

    public function startWork(Request $request, Order $order, Shifts $shifts): RedirectResponse
    {
        Gate::authorize('work', $order);
        $shifts->startWork($request->user(), $order);

        return back()->with('success', __('app.worker.work_started'));
    }

    public function stopWork(Request $request, Order $order, Shifts $shifts): RedirectResponse
    {
        Gate::authorize('work', $order);
        $shifts->stopWork($request->user());

        return back()->with('success', __('app.worker.work_stopped'));
    }

    public function complete(Request $request, Order $order, WorkerOrderActions $actions): RedirectResponse
    {
        Gate::authorize('work', $order);
        $actions->complete($order, $request->user());

        return redirect()->route('worker.orders.index')->with('success', __('app.worker.completed', ['number' => $order->number]));
    }
}
