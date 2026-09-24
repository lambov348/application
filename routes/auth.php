<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordController;
use Illuminate\Support\Facades\Route;

// No self-registration: accounts are created by the owner.
Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store'])->middleware('throttle:20,1');
});

Route::middleware('auth')->group(function () {
    Route::get('password/setup', [PasswordController::class, 'setup'])->name('password.setup');
    Route::put('password/setup', [PasswordController::class, 'storeSetup'])->name('password.setup.store');
    Route::put('password', [PasswordController::class, 'update'])->middleware('password.set')->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
});
