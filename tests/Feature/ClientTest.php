<?php

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Company;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->actingAs(owner($this->company));
});

test('the owner creates a client with several addresses', function () {
    $this->post('/admin/clients', [
        'name' => 'Anna Becker',
        'phone' => '+49 170 1234567',
        'email' => 'anna@example.de',
        'locale' => 'de',
        'addresses' => [
            ['street' => 'Lindenstraße 12', 'zip' => '10969', 'city' => 'Berlin', 'floor' => '3', 'has_elevator' => true],
            ['street' => 'Hauptstraße 3', 'zip' => '14467', 'city' => 'Potsdam'],
        ],
    ])->assertSessionHasNoErrors();

    $client = Client::sole();
    expect($client->company_id)->toBe($this->company->id)
        ->and($client->addresses)->toHaveCount(2)
        ->and(AuditLog::where('entity', 'clients')->where('action', 'created')->exists())->toBeTrue();
});

test('updating a client keeps, changes and removes addresses', function () {
    $client = client($this->company);
    $keep = $client->addresses->first();
    $remove = $client->addresses()->create(['street' => 'Alt 1', 'zip' => '10000', 'city' => 'Berlin']);

    $this->put("/admin/clients/{$client->id}", [
        'name' => $client->name,
        'locale' => 'ru',
        'addresses' => [
            ['id' => $keep->id, 'street' => 'Lindenstraße 14', 'zip' => '10969', 'city' => 'Berlin'],
            ['street' => 'Neu 5', 'zip' => '10115', 'city' => 'Berlin'],
        ],
    ])->assertSessionHasNoErrors();

    $client->refresh();
    expect($client->locale)->toBe('ru')
        ->and($client->addresses->pluck('street')->sort()->values()->all())->toBe(['Lindenstraße 14', 'Neu 5'])
        ->and($remove->fresh()->trashed())->toBeTrue();
});

test('clients can be found by name, phone or e-mail', function () {
    Client::factory()->create(['company_id' => $this->company->id, 'name' => 'Anna Becker', 'phone' => '0170 111', 'email' => 'anna@example.de']);
    Client::factory()->create(['company_id' => $this->company->id, 'name' => 'Thomas Schulz', 'phone' => '0151 222', 'email' => 'tom@example.de']);

    foreach (['becker', '0170', 'anna@'] as $term) {
        $this->getJson('/admin/clients/search?q='.urlencode($term))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Anna Becker');
    }
});

test('the client page shows the order history', function () {
    $order = order($this->company);

    $this->get("/admin/clients/{$order->client_id}")
        ->assertInertia(fn ($page) => $page->has('orders', 1)->where('orders.0.id', $order->id));
});

test('deleting a client is a soft delete', function () {
    $client = client($this->company);

    $this->delete("/admin/clients/{$client->id}")->assertRedirect('/admin/clients');

    expect(Client::withTrashed()->find($client->id)->trashed())->toBeTrue();
});
