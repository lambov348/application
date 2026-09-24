<?php

use App\Enums\OrderStatus;
use App\Models\AppNotification;
use App\Models\Company;
use App\Models\Order;
use App\Models\OrderFile;
use App\Models\PushSubscription;
use App\Models\Shift;
use App\Services\Notifier;
use App\Services\Push\PushResult;
use App\Services\Push\PushSender;
use Illuminate\Support\Carbon;

/** Records pushes instead of sending them. */
class FakePushSender implements PushSender
{
    public array $sent = [];

    public bool $expire = false;

    public function send(PushSubscription $subscription, array $payload): PushResult
    {
        $this->sent[] = ['user_id' => $subscription->user_id, ...$payload];

        return new PushResult(! $this->expire, expired: $this->expire);
    }
}

function device($user): PushSubscription
{
    return PushSubscription::create([
        'user_id' => $user->id,
        'token' => 'https://push.example.com/'.uniqid(),
        'p256dh' => 'key',
        'auth' => 'auth',
    ]);
}

beforeEach(function () {
    $this->push = new FakePushSender;
    app()->instance(PushSender::class, $this->push);

    $this->company = Company::factory()->create();
    $this->owner = owner($this->company);
    $this->worker = worker($this->company, ['locale' => 'ru']);
    device($this->owner);
    device($this->worker);
});

test('a worker is notified in their language when assigned to an order', function () {
    $client = client($this->company);

    $this->actingAs($this->owner)->post('/admin/orders', [
        'client_id' => $client->id, 'address_id' => $client->addresses->first()->id,
        'title' => 'Küchenmontage', 'date' => '2026-09-23', 'start_time' => '09:00',
        'payment_status' => 'unpaid', 'worker_ids' => [$this->worker->id],
    ]);

    expect($this->push->sent)->toHaveCount(1)
        ->and($this->push->sent[0]['user_id'])->toBe($this->worker->id)
        ->and($this->push->sent[0]['title'])->toStartWith('Новый заказ')
        ->and($this->push->sent[0]['body'])->toContain('23.09.2026 09:00')
        ->and($this->push->sent[0]['url'])->toContain('/worker/orders/');

    $notification = AppNotification::sole();
    expect($notification->status)->toBe('sent')
        ->and($notification->locale)->toBe('ru')
        ->and($notification->attempts)->toBe(1);
});

test('workers are notified when date, time or address change, not for other edits', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);
    $data = fn (array $extra) => [
        'client_id' => $order->client_id, 'title' => $order->title, 'payment_status' => 'unpaid',
        'date' => $order->date->format('Y-m-d'), 'start_time' => '09:00', 'end_time' => '15:00',
        'worker_ids' => [$this->worker->id], ...$extra,
    ];

    $this->actingAs($this->owner)->put("/admin/orders/{$order->id}", $data(['price' => '999']));
    expect($this->push->sent)->toHaveCount(0);

    $this->put("/admin/orders/{$order->id}", $data(['start_time' => '11:00', 'end_time' => '16:00']));
    expect($this->push->sent)->toHaveCount(1)
        ->and($this->push->sent[0]['title'])->toContain('изменён');
});

test('a removed worker is told', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);

    $this->actingAs($this->owner)->put("/admin/orders/{$order->id}", [
        'client_id' => $order->client_id, 'title' => $order->title, 'payment_status' => 'unpaid',
        'date' => $order->date->format('Y-m-d'), 'start_time' => '09:00', 'end_time' => '15:00', 'worker_ids' => [],
    ]);

    expect(collect($this->push->sent)->pluck('title')->all())->toBe(["Вас сняли с заказа {$order->number}"]);
});

test('the owner hears about declines, completions and remarks from workers', function () {
    $order = order($this->company, [$this->worker], OrderStatus::Scheduled);
    $this->actingAs($this->worker);

    $this->post("/worker/orders/{$order->id}/decline");
    $this->post("/orders/{$order->id}/comments", ['text' => 'Kunde nicht da']);

    $order->forceFill(['status' => OrderStatus::InProgress])->save();
    OrderFile::factory()->count(2)->create(['order_id' => $order->id]);
    $this->post("/worker/orders/{$order->id}/complete");

    $toOwner = collect($this->push->sent)->where('user_id', $this->owner->id);
    expect($toOwner->pluck('title')->all())->toBe([
        "{$this->worker->name} hat Auftrag {$order->number} abgelehnt",
        "Bemerkung zu {$order->number} von {$this->worker->name}",
        "Auftrag {$order->number} erledigt",
    ])->and($toOwner->pluck('url')->unique()->all())->toBe(["/admin/orders/{$order->id}"]);
});

test('nobody is notified about their own action', function () {
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);

    $this->actingAs($this->owner)->post("/orders/{$order->id}/comments", ['text' => 'Bitte Fotos']);

    expect($this->push->sent)->toBe([]);
});

test('deactivated users get no notifications', function () {
    $this->worker->forceFill(['is_active' => false])->save();
    $client = client($this->company);
    $active = worker($this->company);

    $this->actingAs($this->owner)->post('/admin/orders', [
        'client_id' => $client->id, 'title' => 'X', 'payment_status' => 'unpaid', 'worker_ids' => [$active->id],
    ]);
    $order = Order::sole();
    $order->workers()->attach($this->worker->id);
    app(Notifier::class)->workersOf($order, 'order_changed');

    expect(AppNotification::where('user_id', $this->worker->id)->count())->toBe(0);
});

test('a notification without a device is skipped, dead devices are removed', function () {
    $lonely = worker($this->company);
    app(Notifier::class)->notify($lonely, 'test');
    expect(AppNotification::where('user_id', $lonely->id)->sole()->status)->toBe('skipped');

    $this->push->expire = true;
    app(Notifier::class)->notify($this->worker, 'test');
    expect($this->worker->pushSubscriptions()->count())->toBe(0);
});

test('open shifts get a reminder at 22:00 Berlin time, once', function () {
    Carbon::setTestNow('2026-09-23 06:00:00');
    $this->actingAs($this->worker)->post('/worker/shift/start');
    auth()->logout();

    Carbon::setTestNow('2026-09-23 19:59:00'); // 21:59 Berlin
    $this->artisan('shifts:remind');
    expect($this->push->sent)->toHaveCount(0);

    Carbon::setTestNow('2026-09-23 20:00:00'); // 22:00 Berlin
    $this->artisan('shifts:remind');
    $this->artisan('shifts:remind');

    expect($this->push->sent)->toHaveCount(1)
        ->and($this->push->sent[0]['title'])->toBe('Смена ещё не закрыта')
        ->and(Shift::sole()->reminded_at)->not->toBeNull();
});

test('closed shifts get no reminder', function () {
    Carbon::setTestNow('2026-09-23 06:00:00');
    $this->actingAs($this->worker)->post('/worker/shift/start');
    $this->post('/worker/shift/end');

    Carbon::setTestNow('2026-09-23 20:30:00');
    $this->artisan('shifts:remind');

    expect($this->push->sent)->toBe([]);
});

test('a device can be registered, moved to another user and removed', function () {
    $endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
    $body = ['endpoint' => $endpoint, 'keys' => ['p256dh' => 'p', 'auth' => 'a']];

    $this->actingAs($this->worker)->postJson('/push-subscriptions', $body)->assertNoContent();
    $this->actingAs($this->owner)->postJson('/push-subscriptions', $body)->assertNoContent();

    expect(PushSubscription::where('token', $endpoint)->sole()->user_id)->toBe($this->owner->id);

    $this->deleteJson('/push-subscriptions', ['endpoint' => $endpoint])->assertNoContent();
    expect(PushSubscription::where('token', $endpoint)->exists())->toBeFalse();
});

test('only https push endpoints are accepted', function () {
    $this->actingAs($this->worker)
        ->postJson('/push-subscriptions', ['endpoint' => 'http://evil.test/x', 'keys' => ['p256dh' => 'p', 'auth' => 'a']])
        ->assertUnprocessable();
});

test('the test button sends a push to yourself', function () {
    $this->actingAs($this->worker)->postJson('/push-test')->assertOk()->assertJson(['devices' => 1]);

    expect($this->push->sent[0]['user_id'])->toBe($this->worker->id)
        ->and($this->push->sent[0]['body'])->toBe('Уведомления на этом устройстве работают.');
});
