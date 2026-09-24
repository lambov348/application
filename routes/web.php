<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\OrderCommentController;
use App\Http\Controllers\OrderFileController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Worker;
use Illuminate\Support\Facades\Route;

Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');
Route::view('offline', 'offline')->name('offline');
Route::get('calendar/{token}.ics', [CalendarController::class, 'feed'])
    ->where('token', '[A-Za-z0-9]{48}')->middleware('throttle:60,1')->name('calendar.feed');

Route::middleware(['auth', 'password.set'])->group(function () {
    Route::get('/', HomeController::class)->name('home');
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('profile/calendar-token', [CalendarController::class, 'regenerate'])->name('calendar.regenerate');
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push.subscribe');
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push.unsubscribe');
    Route::post('push-test', [PushSubscriptionController::class, 'test'])->middleware('throttle:10,1')->name('push.test');

    // Shared by owner and workers; access is checked by the policies.
    Route::post('orders/{order}/files', [OrderFileController::class, 'store'])->middleware('throttle:120,1')->name('orders.files.store');
    Route::get('files/{file}', [OrderFileController::class, 'show'])->middleware('signed:relative')->name('files.show');
    Route::delete('files/{file}', [OrderFileController::class, 'destroy'])->name('files.destroy');
    Route::post('orders/{order}/checklist', [ChecklistController::class, 'store'])->name('orders.checklist.store');
    Route::delete('checklist/{item}', [ChecklistController::class, 'destroy'])->name('checklist.destroy');
    Route::post('checklist/{item}/toggle', [ChecklistController::class, 'toggle'])->name('checklist.toggle');
    Route::post('orders/{order}/comments', [OrderCommentController::class, 'store'])->name('orders.comments.store');

    Route::middleware('role:owner')->prefix('admin')->name('admin.')->group(function () {
        Route::resource('orders', Admin\OrderController::class);
        Route::post('orders/{order}/status', Admin\OrderStatusController::class)->name('orders.status');

        Route::get('clients/search', [Admin\ClientController::class, 'search'])->name('clients.search');
        Route::resource('clients', Admin\ClientController::class);

        Route::resource('workers', Admin\WorkerController::class)->except(['show', 'destroy']);
        Route::post('workers/{worker}/toggle-active', [Admin\WorkerController::class, 'toggleActive'])->name('workers.toggle-active');
        Route::post('workers/{worker}/reset-password', [Admin\WorkerController::class, 'resetPassword'])->name('workers.reset-password');
        Route::post('workers/{worker}/rates', [Admin\PayRateController::class, 'store'])->name('workers.rates.store');

        Route::get('hours', [Admin\HoursController::class, 'index'])->name('hours.index');
        Route::post('hours/logs', [Admin\HoursController::class, 'storeLog'])->name('hours.logs.store');
        Route::put('hours/logs/{log}', [Admin\HoursController::class, 'updateLog'])->name('hours.logs.update');
        Route::delete('hours/logs/{log}', [Admin\HoursController::class, 'destroyLog'])->name('hours.logs.destroy');
        Route::put('hours/shifts/{shift}', [Admin\HoursController::class, 'updateShift'])->name('hours.shifts.update');
        Route::post('hours/shifts/{shift}/reviewed', [Admin\HoursController::class, 'reviewShift'])->name('hours.shifts.reviewed');

        Route::get('payroll', [Admin\PayrollController::class, 'index'])->name('payroll.index');
        Route::post('payroll/{period}/adjustments', [Admin\PayrollController::class, 'storeAdjustment'])->name('payroll.adjustments.store');
        Route::delete('payroll/adjustments/{adjustment}', [Admin\PayrollController::class, 'destroyAdjustment'])->name('payroll.adjustments.destroy');
        Route::post('payroll/{period}/close', [Admin\PayrollController::class, 'close'])->name('payroll.close');
    });

    Route::middleware('role:worker')->prefix('worker')->name('worker.')->group(function () {
        Route::get('orders', [Worker\OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [Worker\OrderController::class, 'show'])->name('orders.show');
        Route::post('orders/{order}/accept', [Worker\OrderActionController::class, 'accept'])->name('orders.accept');
        Route::post('orders/{order}/decline', [Worker\OrderActionController::class, 'decline'])->name('orders.decline');
        Route::post('orders/{order}/start', [Worker\OrderActionController::class, 'startWork'])->name('orders.start');
        Route::post('orders/{order}/stop', [Worker\OrderActionController::class, 'stopWork'])->name('orders.stop');
        Route::post('orders/{order}/complete', [Worker\OrderActionController::class, 'complete'])->name('orders.complete');

        Route::post('shift/start', [Worker\ShiftController::class, 'start'])->name('shift.start');
        Route::post('shift/end', [Worker\ShiftController::class, 'end'])->name('shift.end');
    });
});

require __DIR__.'/auth.php';
