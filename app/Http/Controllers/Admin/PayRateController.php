<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PayModel;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Audit;
use App\Services\Payroll\Payroll;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PayRateController extends Controller
{
    /** A new rate from a date on; the previous rate ends the day before. */
    public function store(Request $request, User $worker, Payroll $payroll): RedirectResponse
    {
        Gate::authorize('update', $worker);
        abort_unless($worker->isWorker(), 404);

        foreach (['hourly', 'per_job', 'monthly'] as $f) {
            if (is_string($request->input($f))) {
                $request->merge([$f => str_replace([' ', ','], ['', '.'], $request->input($f))]);
            }
        }

        $model = PayModel::tryFrom((string) $request->input('model'));
        $money = ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:100000'];
        $validated = $request->validate([
            'model' => ['required', Rule::enum(PayModel::class)],
            'hourly' => [...$money, Rule::requiredIf($model?->paysHours() ?? false)],
            'per_job' => [...$money, Rule::requiredIf($model?->paysTrips() ?? false)],
            'monthly' => [...$money, Rule::requiredIf($model === PayModel::Fixed)],
            'valid_from' => ['required', 'date_format:Y-m-d'],
        ], [], [
            'model' => __('ui.pay.model'),
            'hourly' => __('ui.pay.hourly'),
            'per_job' => __('ui.pay.per_job'),
            'monthly' => __('ui.pay.monthly'),
            'valid_from' => __('ui.pay.valid_from'),
        ]);

        $from = CarbonImmutable::parse($validated['valid_from']);
        $tz = $worker->company->timezone ?: config('app.display_timezone');
        $payroll->ensureOpenAt($worker->company_id, CarbonImmutable::parse($validated['valid_from'].' 12:00', $tz), $tz);

        DB::transaction(function () use ($worker, $validated, $from, $model, $request) {
            $previous = $worker->payRates()->lockForUpdate()->get()->last();

            if ($previous && $previous->valid_from->greaterThanOrEqualTo($from)) {
                throw ValidationException::withMessages(['valid_from' => __('app.payroll.errors.rate_date_order')]);
            }

            $previous?->update(['valid_to' => $from->subDay()->format('Y-m-d')]);

            $rate = $worker->payRates()->create([
                'model' => $model,
                'hourly_cents' => $model->paysHours() ? Money::toCents($validated['hourly']) : 0,
                'per_job_cents' => $model->paysTrips() ? Money::toCents($validated['per_job']) : 0,
                'monthly_cents' => $model === PayModel::Fixed ? Money::toCents($validated['monthly']) : 0,
                'valid_from' => $from->format('Y-m-d'),
                'created_by' => $request->user()->id,
            ]);

            Audit::record($worker, 'pay_rate_added', $previous?->only(['model', 'hourly_cents', 'per_job_cents', 'monthly_cents', 'valid_from']), $rate->only(['model', 'hourly_cents', 'per_job_cents', 'monthly_cents', 'valid_from']));
        });

        return back()->with('success', __('app.saved'));
    }
}
