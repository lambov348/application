<?php

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->owner = owner($this->company);
    $this->actingAs($this->owner);
});

test('the owner creates a worker and gets a one-time start password', function () {
    $response = $this->post('/admin/workers', ['name' => 'Dmitri K.', 'login' => 'Dmitri.K', 'phone' => '+49 1', 'locale' => 'ru'])
        ->assertRedirect('/admin/workers')
        ->assertSessionHas('credentials');

    $credentials = session('credentials');
    $worker = User::where('login', 'dmitri.k')->sole();

    expect($worker->isWorker())->toBeTrue()
        ->and($worker->company_id)->toBe($this->company->id)
        ->and($worker->mustSetPassword())->toBeTrue()
        ->and(Hash::check($credentials['password'], $worker->password))->toBeTrue()
        ->and(AuditLog::where('entity', 'users')->where('entity_id', $worker->id)->where('action', 'created')->exists())->toBeTrue();
});

test('usernames are unique', function () {
    worker($this->company, ['login' => 'oleg.s']);

    $this->post('/admin/workers', ['name' => 'Oleg', 'login' => 'oleg.s', 'locale' => 'de'])->assertSessionHasErrors('login');
});

test('deactivating a worker is logged and can be undone', function () {
    $worker = worker($this->company);

    $this->post("/admin/workers/{$worker->id}/toggle-active")->assertSessionHasNoErrors();
    expect($worker->fresh()->is_active)->toBeFalse();

    $this->post("/admin/workers/{$worker->id}/toggle-active");
    expect($worker->fresh()->is_active)->toBeTrue()
        ->and(AuditLog::where('entity_id', $worker->id)->pluck('action')->all())->toBe(['deactivated', 'activated']);
});

test('a deactivated worker keeps their order history', function () {
    $worker = worker($this->company);
    $order = order($this->company, [$worker]);

    $this->post("/admin/workers/{$worker->id}/toggle-active");

    expect($order->workers()->pluck('users.id')->all())->toBe([$worker->id]);
});

test('resetting the password forces a new password on next sign-in', function () {
    $worker = worker($this->company);

    $this->post("/admin/workers/{$worker->id}/reset-password")->assertSessionHas('credentials');

    expect($worker->fresh()->mustSetPassword())->toBeTrue()
        ->and(Hash::check(session('credentials')['password'], $worker->fresh()->password))->toBeTrue();
});

test('the owner cannot lock themselves out', function () {
    $this->post("/admin/workers/{$this->owner->id}/toggle-active")->assertForbidden();
    $this->post("/admin/workers/{$this->owner->id}/reset-password")->assertForbidden();
});
