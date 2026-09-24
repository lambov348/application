<?php

use App\Enums\OrderStatus;
use App\Models\Company;
use App\Models\OrderFile;
use App\Models\WorkLog;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->worker = worker($this->company);
    $this->actingAs($this->worker);
});

test('accepting a scheduled order confirms it', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);

    $this->post("/worker/orders/{$order->id}/accept")->assertSessionHasNoErrors();

    expect($order->fresh()->status)->toBe(OrderStatus::Confirmed)
        ->and($order->workers()->first()->pivot->accepted_at)->not->toBeNull()
        ->and($order->events()->pluck('type')->all())->toContain('worker_accepted', 'status_changed');
});

test('a second worker accepting keeps the order confirmed', function () {
    $colleague = worker($this->company);
    $order = order($this->company, [$this->worker, $colleague], OrderStatus::Confirmed);

    $this->post("/worker/orders/{$order->id}/accept")->assertSessionHasNoErrors();

    expect($order->fresh()->status)->toBe(OrderStatus::Confirmed);
});

test('an order without an appointment cannot be accepted yet', function () {
    $order = order($this->company, [$this->worker], OrderStatus::New);

    $this->post("/worker/orders/{$order->id}/accept")->assertSessionHasErrors('status');
});

test('declining is recorded for the office', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);

    $this->post("/worker/orders/{$order->id}/decline")->assertSessionHasNoErrors();

    expect($order->workers()->first()->pivot->declined_at)->not->toBeNull()
        ->and($order->fresh()->status)->toBe(OrderStatus::Scheduled)
        ->and($order->events()->where('type', 'worker_declined')->exists())->toBeTrue();
});

test('a worker cannot accept an order of a colleague', function () {
    $order = order($this->company, [worker($this->company)], OrderStatus::Scheduled);

    $this->post("/worker/orders/{$order->id}/accept")->assertForbidden();
});

test('completing needs 2 after photos and stops the clock', function () {
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);
    $this->post('/worker/shift/start');
    $this->post("/worker/orders/{$order->id}/start");
    OrderFile::factory()->create(['order_id' => $order->id]);

    $this->post("/worker/orders/{$order->id}/complete")->assertSessionHasErrors('status');
    expect($order->fresh()->status)->toBe(OrderStatus::InProgress);

    OrderFile::factory()->create(['order_id' => $order->id]);
    $this->post("/worker/orders/{$order->id}/complete")->assertRedirect('/worker/orders');

    expect($order->fresh()->status)->toBe(OrderStatus::Completed)
        ->and(WorkLog::sole()->ended_at)->not->toBeNull();
});

test('owners cannot use the worker actions', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);

    $this->actingAs(owner($this->company))->post("/worker/orders/{$order->id}/accept")->assertForbidden();
});

test('the worker page shows the own time on the order but no money', function () {
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);
    $this->post('/worker/shift/start');
    $this->post("/worker/orders/{$order->id}/start");

    $this->get("/worker/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page
            ->where('shift_open', true)
            ->whereNot('order.me.running_since', null)
            ->missing('order.price_cents')
            ->missing('order.hours'));
});

test('the owner sees the hours per worker', function () {
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);
    $this->post('/worker/shift/start');
    $this->post("/worker/orders/{$order->id}/start");

    $this->actingAs(owner($this->company))
        ->get("/admin/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.hours.0.worker', $this->worker->name)
            ->where('order.hours.0.running', true));
});
