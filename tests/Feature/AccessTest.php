<?php

use App\Models\Company;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->worker = worker($this->company);
});

test('workers cannot open any owner page', function (string $method, string $uri) {
    $order = order($this->company, [$this->worker]);
    $uri = str_replace(['{order}', '{client}', '{worker}'], [$order->id, $order->client_id, $this->worker->id], $uri);

    $this->actingAs($this->worker)->{$method}($uri)->assertForbidden();
})->with([
    ['get', '/admin/orders'],
    ['get', '/admin/orders/create'],
    ['post', '/admin/orders'],
    ['get', '/admin/orders/{order}'],
    ['put', '/admin/orders/{order}'],
    ['delete', '/admin/orders/{order}'],
    ['post', '/admin/orders/{order}/status'],
    ['get', '/admin/clients'],
    ['get', '/admin/clients/search'],
    ['get', '/admin/clients/{client}'],
    ['post', '/admin/clients'],
    ['get', '/admin/workers'],
    ['post', '/admin/workers'],
    ['post', '/admin/workers/{worker}/toggle-active'],
    ['post', '/admin/workers/{worker}/reset-password'],
]);

test('guests are sent to the sign-in page', function () {
    $this->get('/admin/orders')->assertRedirect('/login');
    $this->get('/worker/orders')->assertRedirect('/login');
});

test('the start page sends each role to its area', function () {
    $this->actingAs(owner($this->company))->get('/')->assertRedirect('/admin/orders');
    $this->actingAs($this->worker)->get('/')->assertRedirect('/worker/orders');
});

test('a worker sees only orders assigned to them', function () {
    $mine = order($this->company, [$this->worker]);
    $colleague = worker($this->company);
    $other = order($this->company, [$colleague]);

    $this->actingAs($this->worker)
        ->get('/worker/orders')
        ->assertInertia(fn ($page) => $page
            ->has('orders', 1)
            ->where('orders.0.id', $mine->id));

    $this->get("/worker/orders/{$mine->id}")->assertOk();
    $this->get("/worker/orders/{$other->id}")->assertForbidden();
});

test('a worker never receives prices, payment state or the order history', function () {
    $order = order($this->company, [$this->worker]);

    $this->actingAs($this->worker)
        ->get('/worker/orders')
        ->assertInertia(fn ($page) => $page
            ->missing('orders.0.price_cents')
            ->missing('orders.0.payment_status'));

    $this->get("/worker/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.id', $order->id)
            ->missing('order.price_cents')
            ->missing('order.material_cents')
            ->missing('order.payment_status')
            ->missing('order.events')
            ->missing('order.client_email'));
});

test('the owner sees prices', function () {
    $order = order($this->company);

    $this->actingAs(owner($this->company))
        ->get("/admin/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page->where('order.price_cents', $order->price_cents));
});

test('owners cannot open the worker area', function () {
    $this->actingAs(owner($this->company))->get('/worker/orders')->assertForbidden();
});
