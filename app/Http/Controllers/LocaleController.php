<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    /** Switch the interface language with one tap. */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', Rule::in(config('app.supported_locales'))],
        ]);

        $request->session()->put('locale', $validated['locale']);
        $request->user()?->forceFill(['locale' => $validated['locale']])->save();

        return back();
    }
}
