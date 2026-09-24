<?php

use App\Models\Company;
use App\Models\Order;

beforeEach(function () {
    $this->mine = Company::factory()->create();
    $this->other = Company::factory()->create();
    $this->owner = owner($this->mine);
});

test('an owner cannot open another company\'s order, client or worker', function () {
    $otherWorker = worker($this->other);
    $otherOrder = order($this->other, [$otherWorker]);

    $this->actingAs($this->owner);

    $this->get("/admin/orders/{$otherOrder->id}")->assertNotFound();
    $this->put("/admin/orders/{$otherOrder->id}", [])->assertNotFound();
    $this->post("/admin/orders/{$otherOrder->id}/status", ['status' => 'scheduled'])->assertNotFound();
    $this->delete("/admin/orders/{$otherOrder->id}")->assertNotFound();
    $this->get("/admin/clients/{$otherOrder->client_id}")->assertNotFound();
    $this->get("/admin/workers/{$otherWorker->id}/edit")->assertNotFound();
    $this->post("/admin/workers/{$otherWorker->id}/toggle-active")->assertNotFound();

    expect($otherWorker->fresh()->is_active)->toBeTrue();
});

test('lists only contain the own company\'s data', function () {
    $myOrder = order($this->mine);
    order($this->other);
    worker($this->other);
    $myWorker = worker($this->mine);

    $this->actingAs($this->owner);

    $this->get('/admin/orders')->assertInertia(fn ($page) => $page
        ->has('orders.data', 1)
        ->where('orders.data.0.id', $myOrder->id));

    $this->get('/admin/clients')->assertInertia(fn ($page) => $page
        ->has('clients.data', 1)
        ->where('clients.data.0.id', $myOrder->client_id));

    $this->get('/admin/workers')->assertInertia(fn ($page) => $page
        ->has('workers', 1)
        ->where('workers.0.id', $myWorker->id));

    $this->getJson('/admin/clients/search?q='.urlencode(substr($myOrder->client->name, 0, 3)))
        ->assertOk()
        ->assertJsonMissing(['company_id' => $this->other->id]);
});

test('a worker cannot open an order of another company even if assigned there', function () {
    $worker = worker($this->mine);
    $otherOrder = order($this->other);
    $otherOrder->workers()->attach($worker->id);

    $this->actingAs($worker)->get("/worker/orders/{$otherOrder->id}")->assertNotFound();
});

test('orders cannot use another company\'s client or workers', function () {
    $otherClient = client($this->other);
    $otherWorker = worker($this->other);

    $this->actingAs($this->owner)->post('/admin/orders', [
        'client_id' => $otherClient->id,
        'title' => 'Test',
        'payment_status' => 'unpaid',
        'worker_ids' => [$otherWorker->id],
    ])->assertSessionHasErrors(['client_id', 'worker_ids.0']);
});

test('order numbers run separately per company', function () {
    $otherOwner = owner($this->other);
    $client = client($this->mine);
    $otherClient = client($this->other);

    $this->actingAs($this->owner)->post('/admin/orders', ['client_id' => $client->id, 'title' => 'A', 'payment_status' => 'unpaid']);
    $this->actingAs($otherOwner)->post('/admin/orders', ['client_id' => $otherClient->id, 'title' => 'B', 'payment_status' => 'unpaid']);

    $year = now('Europe/Berlin')->year;
    expect(Order::withoutGlobalScopes()->pluck('number')->all())->toBe(["{$year}-0001", "{$year}-0001"]);
});
