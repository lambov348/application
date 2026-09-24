<?php

use App\Enums\OrderStatus;
use App\Models\Company;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->owner = owner($this->company);
    $this->worker = worker($this->company, ['locale' => 'ru']);
});

function feedUrl($user): string
{
    test()->actingAs($user)->get('/profile');
    auth()->logout();

    return '/calendar/'.$user->fresh()->ics_token.'.ics';
}

test('a worker\'s calendar has their orders with time and address but no money', function () {
    $mine = order($this->company, [$this->worker], OrderStatus::Scheduled);
    $mine->forceFill(['address_id' => $mine->client->addresses->first()->id, 'date' => '2026-10-02', 'start_time' => '09:00', 'end_time' => '15:00', 'price_cents' => 148000])->save();
    $other = order($this->company, [worker($this->company)], OrderStatus::Scheduled);

    $ics = $this->get(feedUrl($this->worker))
        ->assertOk()
        ->assertHeader('Content-Type', 'text/calendar; charset=utf-8')
        ->getContent();

    expect($ics)->toStartWith("BEGIN:VCALENDAR\r\n")
        ->toContain("BEGIN:VTIMEZONE\r\nTZID:Europe/Berlin")
        ->toContain("UID:order-{$mine->id}@")
        ->toContain('DTSTART;TZID=Europe/Berlin:20261002T090000')
        ->toContain('DTEND;TZID=Europe/Berlin:20261002T150000')
        ->toContain('LOCATION:Lindenstraße 12\, 10969 Berlin')
        ->toContain('Клиент:')
        ->not->toContain("order-{$other->id}@")
        ->not->toContain('1480')
        ->not->toContain('€');
});

test('declined and rejected orders are left out of a worker\'s calendar', function () {
    $declined = order($this->company, [$this->worker], OrderStatus::Scheduled);
    $declined->workers()->updateExistingPivot($this->worker->id, ['declined_at' => now()]);
    $rejected = order($this->company, [$this->worker], OrderStatus::Rejected);

    $ics = $this->get(feedUrl($this->worker))->getContent();

    expect($ics)->not->toContain("order-{$declined->id}@")->not->toContain("order-{$rejected->id}@");
});

test('the owner\'s calendar has all orders of the company only', function () {
    $a = order($this->company, [], OrderStatus::Scheduled);
    $b = order($this->company, [$this->worker], OrderStatus::Confirmed);
    $foreign = order(Company::factory()->create(), [], OrderStatus::Scheduled);

    $ics = $this->get(feedUrl($this->owner))->getContent();

    expect($ics)->toContain("order-{$a->id}@")->toContain("order-{$b->id}@")->not->toContain("order-{$foreign->id}@");
});

test('a wrong, old or deactivated link does not work', function () {
    $url = feedUrl($this->worker);

    $this->get('/calendar/'.str_repeat('a', 48).'.ics')->assertNotFound();

    $this->actingAs($this->worker)->post('/profile/calendar-token')->assertRedirect();
    auth()->logout();
    $this->get($url)->assertNotFound();

    $newUrl = '/calendar/'.$this->worker->fresh()->ics_token.'.ics';
    $this->get($newUrl)->assertOk();

    $this->worker->forceFill(['is_active' => false])->save();
    $this->get($newUrl)->assertNotFound();
});

test('long lines are folded and special characters escaped', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);
    $order->forceFill(['description' => str_repeat('Montage; Küche, Oberschränke ', 10)])->save();

    $ics = $this->get(feedUrl($this->worker))->getContent();

    foreach (explode("\r\n", $ics) as $line) {
        expect(strlen($line))->toBeLessThanOrEqual(75);
    }
    expect($ics)->toContain('Montage\; Küche\,');
});
