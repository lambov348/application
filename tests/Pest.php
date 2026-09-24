<?php

use App\Enums\OrderStatus;
use App\Models\Client;
use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

function owner(?Company $company = null): User
{
    return User::factory()->owner()->forCompany($company ?? Company::factory()->create())->create();
}

function worker(Company $company, array $attributes = []): User
{
    return User::factory()->worker()->forCompany($company)->create($attributes);
}

function client(Company $company): Client
{
    $client = Client::factory()->create(['company_id' => $company->id]);
    $client->addresses()->create(['street' => 'Lindenstraße 12', 'zip' => '10969', 'city' => 'Berlin']);

    return $client;
}

function order(Company $company, array $workers = [], OrderStatus $status = OrderStatus::New): Order
{
    $order = Order::factory()->status($status)->create(['client_id' => client($company)->id]);
    $order->workers()->sync(collect($workers)->pluck('id'));

    return $order;
}
