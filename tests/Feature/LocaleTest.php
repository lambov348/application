<?php

use App\Models\User;

test('German is used when the browser language is not supported', function () {
    $this->withHeader('Accept-Language', 'fr-FR,fr;q=0.9')->get('/login')->assertInertia(fn ($page) => $page->where('locale', 'de'));
});

test('the browser language is used before sign-in', function () {
    $this->withHeader('Accept-Language', 'ru-RU,ru;q=0.9')
        ->get('/login')
        ->assertInertia(fn ($page) => $page->where('locale', 'ru')->where('translations.auth.sign_in', 'Войти'));
});

test('on first sign-in the browser language is saved for the user', function () {
    $user = User::factory()->owner()->create(['locale' => null]);

    $this->actingAs($user)->withHeader('Accept-Language', 'en-US,en;q=0.9')->get('/admin/orders');

    expect($user->fresh()->locale)->toBe('en');
});

test('the user language wins over the browser language', function () {
    $user = User::factory()->owner()->create(['locale' => 'ru']);

    $this->actingAs($user)->withHeader('Accept-Language', 'en')
        ->get('/admin/orders')
        ->assertInertia(fn ($page) => $page->where('locale', 'ru'));
});

test('the language can be switched with one request', function () {
    $user = User::factory()->owner()->create(['locale' => 'de']);

    $this->actingAs($user)->post('/locale', ['locale' => 'en'])->assertRedirect();

    expect($user->fresh()->locale)->toBe('en');
});

test('only supported languages are accepted', function () {
    $this->post('/locale', ['locale' => 'fr'])->assertSessionHasErrors('locale');
});
