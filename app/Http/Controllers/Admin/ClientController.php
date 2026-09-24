<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ClientRequest;
use App\Models\Client;
use App\Models\Order;
use App\Services\Audit;
use App\Support\OrderPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Client::class);

        $q = (string) $request->string('q')->limit(100, '');

        return Inertia::render('Admin/Clients/Index', [
            'clients' => Client::query()
                ->search($q)
                ->withCount('orders')
                ->with('addresses')
                ->orderBy('name')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (Client $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'email' => $c->email,
                    'address' => $c->addresses->first()?->oneLine(),
                    'orders_count' => $c->orders_count,
                ]),
            'filters' => ['q' => $q],
        ]);
    }

    /** Quick search for the order form. */
    public function search(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Client::class);

        $clients = Client::query()
            ->search((string) $request->string('q')->limit(100, ''))
            ->with('addresses')
            ->orderBy('name')
            ->limit(15)
            ->get()
            ->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'addresses' => $c->addresses->map(fn ($a) => OrderPresenter::address($a))->values(),
            ]);

        return response()->json($clients);
    }

    public function create(): Response
    {
        Gate::authorize('create', Client::class);

        return Inertia::render('Admin/Clients/Form', ['client' => null]);
    }

    public function store(ClientRequest $request): RedirectResponse
    {
        Gate::authorize('create', Client::class);

        $client = DB::transaction(function () use ($request) {
            $client = Client::create($request->safe()->except('addresses'));
            $this->syncAddresses($client, $request->validated('addresses') ?? []);
            Audit::record($client, 'created', after: $client->toArray());

            return $client;
        });

        return redirect()->route('admin.clients.show', $client)->with('success', __('app.saved'));
    }

    public function show(Request $request, Client $client): Response
    {
        Gate::authorize('view', $client);

        $client->load('addresses');
        $orders = $client->orders()->with(['client', 'address', 'workers'])->latest('date')->latest('id')->get();

        return Inertia::render('Admin/Clients/Show', [
            'client' => [
                ...$client->only(['id', 'name', 'phone', 'email', 'locale', 'notes']),
                'addresses' => $client->addresses->map(fn ($a) => OrderPresenter::address($a))->values(),
            ],
            'orders' => $orders->map(fn (Order $o) => OrderPresenter::listItem($o, $request->user()))->values(),
        ]);
    }

    public function edit(Client $client): Response
    {
        Gate::authorize('update', $client);

        $client->load('addresses');

        return Inertia::render('Admin/Clients/Form', [
            'client' => [
                ...$client->only(['id', 'name', 'phone', 'email', 'locale', 'notes']),
                'addresses' => $client->addresses->map(fn ($a) => OrderPresenter::address($a))->values(),
            ],
        ]);
    }

    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        Gate::authorize('update', $client);

        DB::transaction(function () use ($request, $client) {
            $before = $client->load('addresses')->toArray();
            $client->update($request->safe()->except('addresses'));
            $this->syncAddresses($client, $request->validated('addresses') ?? []);
            Audit::record($client, 'updated', $before, $client->fresh('addresses')->toArray());
        });

        return redirect()->route('admin.clients.show', $client)->with('success', __('app.saved'));
    }

    public function destroy(Client $client): RedirectResponse
    {
        Gate::authorize('delete', $client);

        $client->delete();
        Audit::record($client, 'deleted');

        return redirect()->route('admin.clients.index')->with('success', __('app.deleted'));
    }

    /** Update existing addresses, add new ones, soft-delete removed ones. */
    private function syncAddresses(Client $client, array $rows): void
    {
        $keep = [];

        foreach ($rows as $row) {
            $address = isset($row['id']) ? $client->addresses()->find($row['id']) : null;
            $address ??= $client->addresses()->make();
            $address->fill($row)->save();
            $keep[] = $address->id;
        }

        $client->addresses()->whereNotIn('id', $keep)->delete();
    }
}
