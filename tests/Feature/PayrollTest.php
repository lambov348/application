<?php

use App\Enums\OrderStatus;
use App\Enums\PayModel;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\PayrollResult;
use App\Models\Shift;
use App\Models\User;
use App\Models\WorkLog;
use App\Services\Payroll\Payroll;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->owner = owner($this->company);
    $this->worker = worker($this->company);
});

function rate(User $user, PayModel $model, array $cents, string $from = '2026-01-01'): void
{
    $user->payRates()->create([
        'model' => $model,
        'hourly_cents' => $cents['hourly'] ?? 0,
        'per_job_cents' => $cents['per_job'] ?? 0,
        'monthly_cents' => $cents['monthly'] ?? 0,
        'valid_from' => $from,
    ]);
}

/** Clocked time; $start is Berlin time. */
function clocked(User $user, $order, string $start, int $minutes, bool $closed = true): WorkLog
{
    $from = CarbonImmutable::parse($start, 'Europe/Berlin')->utc();
    $shift = Shift::withoutGlobalScopes()->forceCreate([
        'company_id' => $user->company_id, 'user_id' => $user->id,
        'started_at' => $from, 'ended_at' => $closed ? $from->addMinutes($minutes) : null,
    ]);

    return WorkLog::create([
        'shift_id' => $shift->id, 'order_id' => $order->id, 'user_id' => $user->id,
        'started_at' => $from, 'ended_at' => $closed ? $from->addMinutes($minutes) : null,
    ]);
}

function payrollRow(User $user, int $year = 2026, int $month = 9): array
{
    $payroll = app(Payroll::class);

    return $payroll->rows($payroll->period($user->company_id, $year, $month))->firstWhere('user.id', $user->id);
}

test('hourly: only clocked order hours times the hourly rate', function () {
    rate($this->worker, PayModel::Hourly, ['hourly' => 1800]);
    $order = order($this->company, [$this->worker]);
    clocked($this->worker, $order, '2026-09-10 08:00', 120);
    clocked($this->worker, $order, '2026-09-11 08:00', 90);

    $row = payrollRow($this->worker);

    expect($row['hours'])->toBe(3.5)
        ->and($row['gross_cents'])->toBe(6300)
        ->and($row['payable_cents'])->toBe(6300)
        ->and($row['trips'])->toBe(1);
});

test('per trip: one order is one trip, however many days it takes', function () {
    rate($this->worker, PayModel::PerJob, ['per_job' => 9500]);
    $kitchen = order($this->company, [$this->worker]);
    $wardrobe = order($this->company, [$this->worker]);
    clocked($this->worker, $kitchen, '2026-09-10 08:00', 480);
    clocked($this->worker, $kitchen, '2026-09-11 08:00', 240);
    clocked($this->worker, $wardrobe, '2026-09-12 08:00', 120);

    $row = payrollRow($this->worker);

    expect($row['trips'])->toBe(2)->and($row['gross_cents'])->toBe(19000);
});

test('a trip counts in the month the worker started on the order', function () {
    rate($this->worker, PayModel::PerJob, ['per_job' => 9500]);
    $order = order($this->company, [$this->worker]);
    clocked($this->worker, $order, '2026-08-31 08:00', 480);
    clocked($this->worker, $order, '2026-09-01 08:00', 240);

    expect(payrollRow($this->worker, 2026, 8)['trips'])->toBe(1)
        ->and(payrollRow($this->worker, 2026, 9)['trips'])->toBe(0)
        ->and(payrollRow($this->worker, 2026, 9)['hours'])->toBe(4.0);
});

test('mixed: hours × rate + trips × rate + bonuses − deductions − advances (example from the mockup)', function () {
    rate($this->worker, PayModel::Mixed, ['hourly' => 1200, 'per_job' => 4000]);
    $a = order($this->company, [$this->worker]);
    $b = order($this->company, [$this->worker]);
    clocked($this->worker, $a, '2026-09-02 07:00', 600);
    clocked($this->worker, $b, '2026-09-03 07:00', 300);

    $this->actingAs($this->owner);
    $period = app(Payroll::class)->period($this->company->id, 2026, 9);
    $this->post("/admin/payroll/{$period->id}/adjustments", ['user_id' => $this->worker->id, 'type' => 'bonus', 'amount' => '60', 'reason' => 'Samstag'])->assertSessionHasNoErrors();
    $this->post("/admin/payroll/{$period->id}/adjustments", ['user_id' => $this->worker->id, 'type' => 'deduction', 'amount' => '20', 'reason' => 'Beschlag beschädigt']);
    $this->post("/admin/payroll/{$period->id}/adjustments", ['user_id' => $this->worker->id, 'type' => 'advance', 'amount' => '100,50', 'reason' => 'Vorschuss']);

    $row = payrollRow($this->worker);

    // 15 h × 12 + 2 × 40 + 60 − 20 = 300 €; − 100.50 advance = 199.50 €
    expect($row['gross_cents'])->toBe(30000)
        ->and($row['payable_cents'])->toBe(19950)
        ->and($row['details']['advance_cents'])->toBe(10050);
});

test('fixed: the monthly amount, hours do not add', function () {
    rate($this->worker, PayModel::Fixed, ['monthly' => 200000]);
    clocked($this->worker, order($this->company, [$this->worker]), '2026-09-02 07:00', 600);

    $row = payrollRow($this->worker);

    expect($row['gross_cents'])->toBe(200000)->and($row['hours'])->toBe(10.0);
});

test('a rate change in the middle of the month applies from its day', function () {
    rate($this->worker, PayModel::Hourly, ['hourly' => 1000], '2026-01-01');
    $this->worker->payRates()->first()->update(['valid_to' => '2026-09-15']);
    rate($this->worker, PayModel::Hourly, ['hourly' => 2000], '2026-09-16');
    $order = order($this->company, [$this->worker]);
    clocked($this->worker, $order, '2026-09-15 08:00', 60);
    clocked($this->worker, $order, '2026-09-16 08:00', 60);

    expect(payrollRow($this->worker)['gross_cents'])->toBe(3000);
});

test('running clocks and time without a rate are not paid', function () {
    $order = order($this->company, [$this->worker]);
    clocked($this->worker, $order, '2026-09-10 08:00', 60);

    $row = payrollRow($this->worker);
    expect($row['gross_cents'])->toBe(0)->and($row['details']['unrated_seconds'])->toBe(3600);

    rate($this->worker, PayModel::Hourly, ['hourly' => 1800]);
    clocked($this->worker, $order, '2026-09-11 08:00', 60, closed: false);
    expect(payrollRow($this->worker)['gross_cents'])->toBe(1800);
});

test('months follow Berlin time, not UTC', function () {
    rate($this->worker, PayModel::Hourly, ['hourly' => 1000]);
    $order = order($this->company, [$this->worker]);
    clocked($this->worker, $order, '2026-09-01 00:30', 60); // 22:30 UTC on 31 August
    clocked($this->worker, $order, '2026-09-30 23:30', 60); // still September in Berlin

    expect(payrollRow($this->worker, 2026, 9)['hours'])->toBe(2.0)
        ->and(payrollRow($this->worker, 2026, 8)['hours'])->toBe(0.0);
});

test('closing a month freezes it', function () {
    rate($this->worker, PayModel::Hourly, ['hourly' => 1800]);
    $order = order($this->company, [$this->worker]);
    $log = clocked($this->worker, $order, '2026-09-10 08:00', 120);
    $period = app(Payroll::class)->period($this->company->id, 2026, 9);

    $this->actingAs($this->owner)->post("/admin/payroll/{$period->id}/close")->assertSessionHasNoErrors();

    expect(PayrollResult::where('user_id', $this->worker->id)->sole()->gross_cents)->toBe(3600)
        ->and(AuditLog::where('entity', 'payroll_periods')->where('action', 'closed')->exists())->toBeTrue();

    // Later changes do not touch the closed month
    $this->worker->payRates()->update(['hourly_cents' => 5000]);
    expect(payrollRow($this->worker)['gross_cents'])->toBe(3600);

    $this->post("/admin/payroll/{$period->id}/adjustments", ['user_id' => $this->worker->id, 'type' => 'bonus', 'amount' => '10', 'reason' => 'x'])->assertSessionHasErrors('period');
    $this->put("/admin/hours/logs/{$log->id}", ['date' => '2026-09-10', 'start' => '08:00', 'end' => '12:00', 'reason' => 'x'])->assertSessionHasErrors('period');
    $this->post("/admin/workers/{$this->worker->id}/rates", ['model' => 'hourly', 'hourly' => '20', 'valid_from' => '2026-09-20'])->assertSessionHasErrors('period');
    $this->post("/admin/payroll/{$period->id}/close")->assertSessionHasErrors('period');

    expect($log->fresh()->seconds())->toBe(7200);
});

test('the owner corrects hours only with a reason, and it is logged', function () {
    $log = clocked($this->worker, order($this->company, [$this->worker]), '2026-09-10 08:00', 60);
    $this->actingAs($this->owner);

    $this->put("/admin/hours/logs/{$log->id}", ['date' => '2026-09-10', 'start' => '08:00', 'end' => '11:30'])->assertSessionHasErrors('reason');
    $this->put("/admin/hours/logs/{$log->id}", ['date' => '2026-09-10', 'start' => '08:00', 'end' => '11:30', 'reason' => 'Vergessen auszustempeln'])->assertSessionHasNoErrors();

    expect($log->fresh()->seconds())->toBe(12600);
    $audit = AuditLog::where('entity', 'work_logs')->where('action', 'hours_corrected')->sole();
    expect($audit->reason)->toBe('Vergessen auszustempeln')
        ->and($audit->user_id)->toBe($this->owner->id)
        ->and($audit->before['ended_at'])->not->toBe($audit->after['ended_at']);
});

test('the owner can add forgotten time and delete wrong entries', function () {
    $order = order($this->company, [$this->worker]);
    $this->actingAs($this->owner);

    $this->post('/admin/hours/logs', [
        'user_id' => $this->worker->id, 'order_id' => $order->id,
        'date' => '2026-09-12', 'start' => '09:00', 'end' => '13:00', 'reason' => 'Handy leer',
    ])->assertSessionHasNoErrors();

    $log = WorkLog::sole();
    expect($log->seconds())->toBe(14400)->and($log->shift)->not->toBeNull();

    $this->delete("/admin/hours/logs/{$log->id}", ['reason' => 'Doppelt'])->assertSessionHasNoErrors();
    expect(WorkLog::count())->toBe(0)
        ->and(AuditLog::where('action', 'hours_deleted')->sole()->reason)->toBe('Doppelt');
});

test('auto-closed shifts show up for review and can be confirmed', function () {
    $log = clocked($this->worker, order($this->company, [$this->worker]), '2026-09-10 08:00', 60);
    $log->shift->forceFill(['auto_closed' => true, 'needs_review' => true])->save();

    $this->actingAs($this->owner)->get('/admin/hours?month=2026-09')
        ->assertInertia(fn ($page) => $page->where('shifts.0.needs_review', true));

    $this->post("/admin/hours/shifts/{$log->shift_id}/reviewed");
    expect($log->shift->fresh()->needs_review)->toBeFalse();
});

test('workers cannot see payroll, hours or rates', function () {
    $this->actingAs($this->worker);

    $this->get('/admin/payroll')->assertForbidden();
    $this->get('/admin/hours')->assertForbidden();
    $this->post("/admin/workers/{$this->worker->id}/rates", ['model' => 'hourly', 'hourly' => '99', 'valid_from' => '2026-09-01'])->assertForbidden();
});

test('a worker sees only their own month on the home screen', function () {
    rate($this->worker, PayModel::Hourly, ['hourly' => 1800]);
    $colleague = worker($this->company);
    rate($colleague, PayModel::Hourly, ['hourly' => 9900]);
    $order = order($this->company, [$this->worker, $colleague]);
    $now = now('Europe/Berlin')->startOfMonth()->addHours(9)->format('Y-m-d H:i');
    clocked($this->worker, $order, $now, 60);
    clocked($colleague, $order, $now, 600);

    $this->actingAs($this->worker)->get('/worker/orders')
        ->assertInertia(fn ($page) => $page
            ->where('my_month.hours', 1)
            ->where('my_month.gross_cents', 1800)
            ->missing('rows'));
});

test('another company\'s payroll and hours are out of reach', function () {
    $foreign = worker(Company::factory()->create());
    $log = clocked($foreign, order($foreign->company, [$foreign]), '2026-09-10 08:00', 60);
    $period = app(Payroll::class)->period($foreign->company_id, 2026, 9);

    $this->actingAs($this->owner);
    $this->post("/admin/payroll/{$period->id}/close")->assertNotFound();
    $this->put("/admin/hours/logs/{$log->id}", ['date' => '2026-09-10', 'start' => '08:00', 'end' => '12:00', 'reason' => 'x'])->assertNotFound();
    $this->post("/admin/workers/{$foreign->id}/rates", ['model' => 'hourly', 'hourly' => '1', 'valid_from' => '2026-09-01'])->assertNotFound();

    $this->get('/admin/payroll?month=2026-09')->assertInertia(fn ($page) => $page->where('rows', fn ($rows) => collect($rows)->pluck('user_id')->doesntContain($foreign->id)));
});

test('a new rate ends the previous one and must start later', function () {
    $this->actingAs($this->owner);

    $this->post("/admin/workers/{$this->worker->id}/rates", ['model' => 'hourly', 'hourly' => '18', 'valid_from' => '2026-10-01'])->assertSessionHasNoErrors();
    $this->post("/admin/workers/{$this->worker->id}/rates", ['model' => 'mixed', 'hourly' => '12', 'per_job' => '40', 'valid_from' => '2026-11-01'])->assertSessionHasNoErrors();
    $this->post("/admin/workers/{$this->worker->id}/rates", ['model' => 'hourly', 'hourly' => '20', 'valid_from' => '2026-10-15'])->assertSessionHasErrors('valid_from');
    $this->post("/admin/workers/{$this->worker->id}/rates", ['model' => 'per_job', 'valid_from' => '2026-12-01'])->assertSessionHasErrors('per_job');

    $rates = $this->worker->payRates()->get();
    expect($rates)->toHaveCount(2)
        ->and($rates[0]->valid_to->format('Y-m-d'))->toBe('2026-10-31')
        ->and($rates[1]->per_job_cents)->toBe(4000)
        ->and(AuditLog::where('action', 'pay_rate_added')->count())->toBe(2);
});

test('the order shows what remains for the business', function () {
    rate($this->worker, PayModel::Mixed, ['hourly' => 1800, 'per_job' => 5000]);
    $order = order($this->company, [$this->worker], OrderStatus::InProgress);
    $order->forceFill(['price_cents' => 148000, 'material_cents' => 32300])->save();
    clocked($this->worker, $order, '2026-09-10 08:00', 240);
    clocked($this->worker, $order, '2026-09-11 08:00', 120);

    // labour: 6 h × 18 + 1 trip × 50 = 158 €; remains 1480 − 323 − 158 = 999 €
    $this->actingAs($this->owner)->get("/admin/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page->where('order.labor_cents', 15800)->where('order.remaining_cents', 99900));
});
