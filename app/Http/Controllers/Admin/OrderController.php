<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderRequest;
use App\Models\Client;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderAssignments;
use App\Services\OrderNumberGenerator;
use App\Support\Money;
use App\Support\OrderPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Order::class);

        $filters = $request->validate([
            'status' => ['nullable', Rule::in(OrderStatus::values())],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $orders = Order::query()
            ->with(['client', 'address', 'workers'])
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status))
            ->when($filters['q'] ?? null, function (Builder $q, $term) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
                $q->where(fn (Builder $w) => $w
                    ->where('number', 'ilike', $like)
                    ->orWhere('title', 'ilike', $like)
                    ->orWhereHas('client', fn (Builder $c) => $c->where('name', 'ilike', $like)));
            })
            ->orderByRaw('date IS NULL, date DESC, start_time DESC, id DESC')
            ->paginate(25)
            ->withQueryString();

        $user = $request->user();

        return Inertia::render('Admin/Orders/Index', [
            'orders' => $orders->through(fn (Order $o) => OrderPresenter::listItem($o, $user)),
            'filters' => $filters,
            'counts' => Order::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Order::class);

        $client = $request->integer('client_id')
            ? Client::with('addresses')->find($request->integer('client_id'))
            : null;

        return Inertia::render('Admin/Orders/Form', [
            'order' => null,
            'client' => $client ? $this->clientOption($client) : null,
            'workers' => $this->workerOptions(),
        ]);
    }

    public function store(OrderRequest $request, OrderNumberGenerator $numbers, OrderAssignments $assignments): RedirectResponse
    {
        Gate::authorize('create', Order::class);

        $order = DB::transaction(function () use ($request, $numbers, $assignments) {
            $order = new Order($request->orderData());
            $order->company_id = $request->user()->company_id;
            $order->number = $numbers->next($order->company_id);
            $order->status = $order->date ? OrderStatus::Scheduled : OrderStatus::New;
            $order->save();

            $assignments->sync($order, $request->workerIds());

            return $order;
        });

        return redirect()->route('admin.orders.show', $order)->with('success', __('app.orders.created', ['number' => $order->number]));
    }

    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('view', $order);

        $order->load(['client', 'address', 'workers', 'events.user', 'checklist.doneBy', 'files.uploader', 'files.order', 'comments.user', 'workLogs.user']);

        return Inertia::render('Admin/Orders/Show', [
            'order' => OrderPresenter::detail($order, $request->user()),
        ]);
    }

    public function edit(Order $order): Response
    {
        Gate::authorize('update', $order);

        $order->load(['client.addresses', 'workers']);

        return Inertia::render('Admin/Orders/Form', [
            'order' => [
                'id' => $order->id,
                'number' => $order->number,
                'client_id' => $order->client_id,
                'address_id' => $order->address_id,
                'title' => $order->title,
                'description' => $order->description,
                'date' => $order->date?->format('Y-m-d'),
                'start_time' => $order->start_time ? substr($order->start_time, 0, 5) : null,
                'end_time' => $order->end_time ? substr($order->end_time, 0, 5) : null,
                'price' => Money::toEuros($order->price_cents),
                'material' => Money::toEuros($order->material_cents),
                'source' => $order->source,
                'offer_no' => $order->offer_no,
                'payment_status' => $order->payment_status->value,
                'worker_ids' => $order->workers->pluck('id'),
            ],
            'client' => $this->clientOption($order->client),
            'workers' => $this->workerOptions($order),
        ]);
    }

    public function update(OrderRequest $request, Order $order, OrderAssignments $assignments): RedirectResponse
    {
        Gate::authorize('update', $order);

        DB::transaction(function () use ($request, $order, $assignments) {
            $order->fill($request->orderData());

            // A new order gets "scheduled" as soon as it has a date.
            if ($order->status === OrderStatus::New && $order->date) {
                $order->status = OrderStatus::Scheduled;
            }

            $order->save();
            $assignments->sync($order, $request->workerIds());
        });

        return redirect()->route('admin.orders.show', $order)->with('success', __('app.saved'));
    }

    public function destroy(Order $order): RedirectResponse
    {
        Gate::authorize('delete', $order);

        $order->delete();

        return redirect()->route('admin.orders.index')->with('success', __('app.orders.deleted', ['number' => $order->number]));
    }

    private function clientOption(Client $client): array
    {
        $client->loadMissing('addresses');

        return [
            'id' => $client->id,
            'name' => $client->name,
            'phone' => $client->phone,
            'addresses' => $client->addresses->map(fn ($a) => OrderPresenter::address($a))->values(),
        ];
    }

    /** Active workers plus workers already on this order (even if deactivated since). */
    private function workerOptions(?Order $order = null): array
    {
        $assigned = $order?->workers->pluck('id')->all() ?? [];

        return User::workers()
            ->where(fn (Builder $q) => $q->where('is_active', true)->orWhereIn('id', $assigned))
            ->orderBy('name')
            ->get(['id', 'name', 'is_active'])
            ->toArray();
    }
}
