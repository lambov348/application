<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Worker;
use Illuminate\Support\Facades\Route;

Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth', 'password.set'])->group(function () {
    Route::get('/', HomeController::class)->name('home');
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');

    Route::middleware('role:owner')->prefix('admin')->name('admin.')->group(function () {
        Route::resource('orders', Admin\OrderController::class);
        Route::post('orders/{order}/status', Admin\OrderStatusController::class)->name('orders.status');

        Route::get('clients/search', [Admin\ClientController::class, 'search'])->name('clients.search');
        Route::resource('clients', Admin\ClientController::class);

        Route::resource('workers', Admin\WorkerController::class)->except(['show', 'destroy']);
        Route::post('workers/{worker}/toggle-active', [Admin\WorkerController::class, 'toggleActive'])->name('workers.toggle-active');
        Route::post('workers/{worker}/reset-password', [Admin\WorkerController::class, 'resetPassword'])->name('workers.reset-password');
    });

    Route::middleware('role:worker')->prefix('worker')->name('worker.')->group(function () {
        Route::get('orders', [Worker\OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [Worker\OrderController::class, 'show'])->name('orders.show');
    });
});

require __DIR__.'/auth.php';
