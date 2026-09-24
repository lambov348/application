<?php

use App\Enums\OrderStatus;
use App\Models\Company;
use App\Models\Order;
use App\Models\OrderFile;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->owner = owner($this->company);
    $this->actingAs($this->owner);
});

test('the owner creates an order with number, workers and history', function () {
    $client = client($this->company);
    $worker = worker($this->company);

    $this->post('/admin/orders', [
        'client_id' => $client->id,
        'address_id' => $client->addresses->first()->id,
        'title' => 'Küchenmontage',
        'description' => 'Montage Küche 3,2 m',
        'date' => '2026-09-23',
        'start_time' => '09:00',
        'end_time' => '15:00',
        'price' => '1480,50',
        'material' => '323',
        'payment_status' => 'unpaid',
        'worker_ids' => [$worker->id],
    ])->assertSessionHasNoErrors()->assertRedirect();

    $order = Order::sole();
    expect($order->number)->toMatch('/^\d{4}-0001$/')
        ->and($order->status)->toBe(OrderStatus::Scheduled)
        ->and($order->price_cents)->toBe(148050)
        ->and($order->material_cents)->toBe(32300)
        ->and($order->workers->pluck('id')->all())->toBe([$worker->id])
        ->and($order->events()->pluck('type')->sort()->values()->all())->toBe(['created', 'worker_assigned']);
});

test('an order without a date stays new', function () {
    $this->post('/admin/orders', ['client_id' => client($this->company)->id, 'title' => 'Umzug', 'payment_status' => 'unpaid']);

    expect(Order::sole()->status)->toBe(OrderStatus::New);
});

test('order numbers count up within a year', function () {
    $client = client($this->company);

    foreach (range(1, 3) as $i) {
        $this->post('/admin/orders', ['client_id' => $client->id, 'title' => "Auftrag {$i}", 'payment_status' => 'unpaid']);
    }

    $year = now('Europe/Berlin')->year;
    expect(Order::orderBy('id')->pluck('number')->all())->toBe(["{$year}-0001", "{$year}-0002", "{$year}-0003"]);
});

test('the end time must be after the start time', function () {
    $this->post('/admin/orders', [
        'client_id' => client($this->company)->id, 'title' => 'X', 'payment_status' => 'unpaid',
        'date' => '2026-09-23', 'start_time' => '15:00', 'end_time' => '09:00',
    ])->assertSessionHasErrors('end_time');
});

test('the address must belong to the chosen client', function () {
    $this->post('/admin/orders', [
        'client_id' => client($this->company)->id,
        'address_id' => client($this->company)->addresses->first()->id,
        'title' => 'X', 'payment_status' => 'unpaid',
    ])->assertSessionHasErrors('address_id');
});

test('every change is written to the order history', function () {
    $order = order($this->company);
    $worker = worker($this->company);

    $this->put("/admin/orders/{$order->id}", [
        'client_id' => $order->client_id,
        'title' => 'Neuer Titel',
        'price' => '99.00',
        'payment_status' => 'invoiced',
        'worker_ids' => [$worker->id],
    ])->assertSessionHasNoErrors();

    $updated = $order->events()->where('type', 'updated')->sole();
    expect($updated->data['changes'])->toHaveKeys(['title', 'price_cents', 'payment_status'])
        ->and($updated->user_id)->toBe($this->owner->id)
        ->and($order->events()->where('type', 'worker_assigned')->exists())->toBeTrue();
});

test('status moves along the allowed path', function () {
    $order = order($this->company);

    foreach (['scheduled', 'confirmed', 'in_progress'] as $status) {
        $this->post("/admin/orders/{$order->id}/status", ['status' => $status])->assertSessionHasNoErrors();
    }

    expect($order->fresh()->status)->toBe(OrderStatus::InProgress)
        ->and($order->events()->where('type', 'status_changed')->count())->toBe(3);
});

test('statuses cannot be skipped', function () {
    $order = order($this->company);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'in_progress'])->assertSessionHasErrors('status');

    expect($order->fresh()->status)->toBe(OrderStatus::New);
});

test('rejecting requires a reason', function () {
    $order = order($this->company);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'rejected'])->assertSessionHasErrors('reason');
    $this->post("/admin/orders/{$order->id}/status", ['status' => 'rejected', 'reason' => 'Zu weit entfernt'])->assertSessionHasNoErrors();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Rejected)
        ->and($order->reject_reason)->toBe('Zu weit entfernt')
        ->and($order->events()->where('type', 'status_changed')->sole()->data['reason'])->toBe('Zu weit entfernt');
});

test('only new or scheduled orders can be rejected', function () {
    $order = order($this->company, status: OrderStatus::InProgress);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'rejected', 'reason' => 'x'])->assertSessionHasErrors('status');
});

test('an order cannot be completed without 2 after photos', function () {
    $worker = worker($this->company);
    $order = order($this->company, [$worker], OrderStatus::InProgress);
    OrderFile::factory()->create(['order_id' => $order->id]);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertSessionHasErrors('status');
    expect($order->fresh()->status)->toBe(OrderStatus::InProgress);

    OrderFile::factory()->create(['order_id' => $order->id]);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertSessionHasNoErrors();
    expect($order->fresh()->status)->toBe(OrderStatus::Completed)
        ->and($order->fresh()->completed_at)->not->toBeNull();
});

test('before photos do not count for completion', function () {
    $worker = worker($this->company);
    $order = order($this->company, [$worker], OrderStatus::InProgress);
    OrderFile::factory()->count(3)->create(['order_id' => $order->id, 'kind' => 'before']);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertSessionHasErrors('status');
});

test('marking as paid records the payment', function () {
    $order = order($this->company, status: OrderStatus::Completed);

    $this->post("/admin/orders/{$order->id}/status", ['status' => 'paid'])->assertSessionHasNoErrors();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Paid)
        ->and($order->payment_status->value)->toBe('paid')
        ->and($order->paid_at)->not->toBeNull();
});

test('deleting an order keeps it in the database', function () {
    $order = order($this->company);

    $this->delete("/admin/orders/{$order->id}")->assertRedirect('/admin/orders');

    expect(Order::find($order->id))->toBeNull()
        ->and(Order::withTrashed()->find($order->id))->not->toBeNull();
});

test('deactivated workers cannot be assigned to new orders', function () {
    $inactive = worker($this->company, ['is_active' => false]);

    $this->post('/admin/orders', [
        'client_id' => client($this->company)->id, 'title' => 'X', 'payment_status' => 'unpaid', 'worker_ids' => [$inactive->id],
    ])->assertSessionHasErrors('worker_ids.0');
});
