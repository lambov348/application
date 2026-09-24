<?php

use App\Enums\OrderStatus;
use App\Models\Company;
use App\Models\Shift;
use App\Models\WorkLog;
use App\Services\Shifts;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->worker = worker($this->company);
    $this->actingAs($this->worker);
});

test('a worker starts and ends a shift with the server time', function () {
    Carbon::setTestNow('2026-09-23 06:52:00');
    $this->post('/worker/shift/start', ['started_at' => '2020-01-01 00:00'])->assertSessionHasNoErrors();

    $shift = Shift::sole();
    expect($shift->started_at->toDateTimeString())->toBe('2026-09-23 06:52:00')
        ->and($shift->company_id)->toBe($this->company->id);

    Carbon::setTestNow('2026-09-23 15:10:00');
    $this->post('/worker/shift/end')->assertSessionHasNoErrors();

    expect($shift->fresh()->ended_at->toDateTimeString())->toBe('2026-09-23 15:10:00')
        ->and($shift->fresh()->needs_review)->toBeFalse();
});

test('a shift cannot be started twice', function () {
    $this->post('/worker/shift/start');
    $this->post('/worker/shift/start')->assertSessionHasErrors('shift');

    expect(Shift::count())->toBe(1);
});

test('work on an order needs a started shift', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Confirmed);

    $this->post("/worker/orders/{$order->id}/start")->assertSessionHasErrors('shift');

    expect(WorkLog::count())->toBe(0);
});

test('starting work puts a confirmed order in progress and starts the clock', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Confirmed);
    $this->post('/worker/shift/start');

    $this->post("/worker/orders/{$order->id}/start")->assertSessionHasNoErrors();

    expect($order->fresh()->status)->toBe(OrderStatus::InProgress)
        ->and(WorkLog::sole()->order_id)->toBe($order->id)
        ->and(WorkLog::sole()->ended_at)->toBeNull();
});

test('switching to another order stops the clock on the first', function () {
    $first = order($this->company, [$this->worker], OrderStatus::InProgress);
    $second = order($this->company, [$this->worker], OrderStatus::Confirmed);
    $this->post('/worker/shift/start');

    $this->post("/worker/orders/{$first->id}/start");
    $this->post("/worker/orders/{$second->id}/start");

    expect(WorkLog::where('order_id', $first->id)->sole()->ended_at)->not->toBeNull()
        ->and(WorkLog::where('order_id', $second->id)->sole()->ended_at)->toBeNull();
});

test('ending the shift stops the clock', function () {
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);
    $this->post('/worker/shift/start');
    $this->post("/worker/orders/{$order->id}/start");

    $this->post('/worker/shift/end');

    expect(WorkLog::sole()->ended_at)->not->toBeNull();
});

test('work cannot start on a scheduled order that nobody accepted', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);
    $this->post('/worker/shift/start');

    $this->post("/worker/orders/{$order->id}/start")->assertSessionHasErrors('status');
});

test('a worker cannot clock in on an order they are not assigned to', function () {
    $order = order($this->company, [worker($this->company)], OrderStatus::Confirmed);
    $this->post('/worker/shift/start');

    $this->post("/worker/orders/{$order->id}/start")->assertForbidden();
});

test('open shifts are closed at 23:59 Berlin time and marked for review', function () {
    Carbon::setTestNow('2026-09-23 06:00:00'); // 08:00 in Berlin
    $this->post('/worker/shift/start');
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);
    $this->post("/worker/orders/{$order->id}/start");

    $shifts = app(Shifts::class);
    expect($shifts->autoCloseDue(CarbonImmutable::parse('2026-09-23 21:58:00')))->toBe(0); // 23:58 Berlin
    expect($shifts->autoCloseDue(CarbonImmutable::parse('2026-09-23 21:59:00')))->toBe(1); // 23:59 Berlin

    $shift = Shift::sole();
    expect($shift->ended_at->toDateTimeString())->toBe('2026-09-23 21:59:00')
        ->and($shift->auto_closed)->toBeTrue()
        ->and($shift->needs_review)->toBeTrue()
        ->and(WorkLog::sole()->ended_at->toDateTimeString())->toBe('2026-09-23 21:59:00');
});

test('a shift forgotten for days is closed at 23:59 of its first day', function () {
    Carbon::setTestNow('2026-09-20 07:00:00');
    $this->post('/worker/shift/start');

    app(Shifts::class)->autoCloseDue(CarbonImmutable::parse('2026-09-23 10:00:00'));

    expect(Shift::sole()->ended_at->toDateTimeString())->toBe('2026-09-20 21:59:00');
});

test('the auto-close command runs', function () {
    $this->artisan('shifts:auto-close')->assertSuccessful();
});
