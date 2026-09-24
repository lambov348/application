<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // checked by the policy in the controller
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'locale' => ['required', Rule::in(config('app.supported_locales'))],
            'notes' => ['nullable', 'string', 'max:5000'],
            'addresses' => ['array', 'max:20'],
            'addresses.*.id' => ['nullable', 'integer'],
            'addresses.*.street' => ['required', 'string', 'max:255'],
            'addresses.*.zip' => ['required', 'string', 'max:10'],
            'addresses.*.city' => ['required', 'string', 'max:100'],
            'addresses.*.floor' => ['nullable', 'string', 'max:20'],
            'addresses.*.has_elevator' => ['nullable', 'boolean'],
            'addresses.*.parking_note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => __('ui.clients.fields.name'),
            'phone' => __('ui.clients.fields.phone'),
            'email' => __('ui.clients.fields.email'),
            'locale' => __('ui.clients.fields.locale'),
            'notes' => __('ui.clients.fields.notes'),
            'addresses.*.street' => __('ui.addresses.street'),
            'addresses.*.zip' => __('ui.addresses.zip'),
            'addresses.*.city' => __('ui.addresses.city'),
            'addresses.*.floor' => __('ui.addresses.floor'),
            'addresses.*.parking_note' => __('ui.addresses.parking_note'),
        ];
    }
}
