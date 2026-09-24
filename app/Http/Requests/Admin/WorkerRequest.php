<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WorkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // checked by the policy in the controller
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['login' => mb_strtolower(trim((string) $this->input('login')))]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'login' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-z0-9._-]+$/', Rule::unique('users', 'login')->ignore($this->route('worker'))],
            'phone' => ['nullable', 'string', 'max:50'],
            'locale' => ['required', Rule::in(config('app.supported_locales'))],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => __('ui.workers.fields.name'),
            'login' => __('ui.workers.fields.login'),
            'phone' => __('ui.workers.fields.phone'),
            'locale' => __('ui.workers.fields.locale'),
        ];
    }
}
