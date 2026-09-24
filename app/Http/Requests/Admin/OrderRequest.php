<?php

namespace App\Http\Requests\Admin;

use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // checked by the policy in the controller
    }

    public function rules(): array
    {
        $companyId = $this->user()->company_id;

        return [
            'client_id' => ['required', 'integer', Rule::exists('clients', 'id')->where('company_id', $companyId)->whereNull('deleted_at')],
            'address_id' => ['nullable', 'integer', Rule::exists('addresses', 'id')->where('client_id', $this->input('client_id'))->whereNull('deleted_at')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'price' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:1000000'],
            'material' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:1000000'],
            'source' => ['nullable', 'string', 'max:100'],
            'offer_no' => ['nullable', 'string', 'max:50'],
            'payment_status' => ['required', Rule::in(PaymentStatus::values())],
            'worker_ids' => ['array'],
            'worker_ids.*' => ['integer', 'distinct', Rule::exists('users', 'id')->where('company_id', $companyId)->where('role', Role::Worker->value)->where('is_active', true)->whereNull('deleted_at')],
        ];
    }

    protected function prepareForValidation(): void
    {
        // Accept a decimal comma ("1480,50") as typed in DE/RU.
        foreach (['price', 'material'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => str_replace([' ', ','], ['', '.'], $this->input($field))]);
            }
        }
    }

    public function attributes(): array
    {
        return [
            'client_id' => __('ui.orders.fields.client'),
            'address_id' => __('ui.orders.fields.address'),
            'title' => __('ui.orders.fields.title'),
            'description' => __('ui.orders.fields.description'),
            'date' => __('ui.orders.fields.date'),
            'start_time' => __('ui.orders.fields.start_time'),
            'end_time' => __('ui.orders.fields.end_time'),
            'price' => __('ui.orders.fields.price'),
            'material' => __('ui.orders.fields.material'),
            'source' => __('ui.orders.fields.source'),
            'offer_no' => __('ui.orders.fields.offer_no'),
            'worker_ids.*' => __('ui.orders.fields.workers'),
        ];
    }

    /** Attributes for the Order model. */
    public function orderData(): array
    {
        return [
            ...$this->safe()->only(['client_id', 'address_id', 'title', 'description', 'date', 'start_time', 'end_time', 'source', 'offer_no', 'payment_status']),
            'price_cents' => Money::toCents($this->validated('price')),
            'material_cents' => Money::toCents($this->validated('material')),
        ];
    }

    /** @return list<int> */
    public function workerIds(): array
    {
        return array_map('intval', $this->validated('worker_ids') ?? []);
    }
}
