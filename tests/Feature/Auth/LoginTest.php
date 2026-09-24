<?php

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('the sign-in screen can be rendered', function () {
    $this->get('/login')->assertOk();
});

test('there is no self-registration', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register')->assertNotFound();
});

test('users sign in with their username', function () {
    $user = owner();

    $this->post('/login', ['login' => $user->login, 'password' => 'password'])
        ->assertRedirect('/');

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->last_login_at)->not->toBeNull();
});

test('the username is not case sensitive', function () {
    $user = owner();

    $this->post('/login', ['login' => strtoupper($user->login), 'password' => 'password']);

    $this->assertAuthenticatedAs($user);
});

test('a wrong password is rejected', function () {
    $user = owner();

    $this->post('/login', ['login' => $user->login, 'password' => 'wrong'])->assertSessionHasErrors('login');

    $this->assertGuest();
});

test('a deactivated worker cannot sign in', function () {
    $worker = worker(Company::factory()->create(), ['is_active' => false]);

    $this->post('/login', ['login' => $worker->login, 'password' => 'password'])->assertSessionHasErrors('login');

    $this->assertGuest();
});

test('users of a deactivated company cannot sign in', function () {
    $user = owner(Company::factory()->create(['is_active' => false]));

    $this->post('/login', ['login' => $user->login, 'password' => 'password'])->assertSessionHasErrors('login');

    $this->assertGuest();
});

test('a worker deactivated during a session loses access on the next request', function () {
    $worker = worker(Company::factory()->create());
    $this->actingAs($worker)->get('/worker/orders')->assertOk();

    $worker->forceFill(['is_active' => false])->save();

    $this->get('/worker/orders')->assertRedirect('/login');
    $this->assertGuest();
});

test('on first sign-in the worker must choose a password', function () {
    $worker = User::factory()->worker()->withStartPassword()->create();

    $this->actingAs($worker)->get('/worker/orders')->assertRedirect('/password/setup');
    $this->get('/password/setup')->assertOk();

    $this->put('/password/setup', ['password' => 'my-own-pass', 'password_confirmation' => 'my-own-pass'])
        ->assertRedirect('/');

    expect($worker->fresh()->mustSetPassword())->toBeFalse();
    $this->get('/worker/orders')->assertOk();
});

test('users can sign out', function () {
    $this->actingAs(owner())->post('/logout')->assertRedirect('/login');

    $this->assertGuest();
});

test('the password can be changed in the profile', function () {
    $user = owner();

    $this->actingAs($user)
        ->put('/password', ['current_password' => 'password', 'password' => 'new-password', 'password_confirmation' => 'new-password'])
        ->assertSessionHasNoErrors();

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});

test('the current password is required to change it', function () {
    $this->actingAs(owner())
        ->put('/password', ['current_password' => 'wrong', 'password' => 'new-password', 'password_confirmation' => 'new-password'])
        ->assertSessionHasErrors('current_password');
});
