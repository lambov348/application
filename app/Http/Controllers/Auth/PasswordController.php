<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /** First sign-in: replace the start password. */
    public function setup(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->mustSetPassword()) {
            return redirect()->route('home');
        }

        return Inertia::render('Auth/SetPassword');
    }

    public function storeSetup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->forceFill([
            'password' => $validated['password'],
            'password_changed_at' => now(),
        ])->save();

        return redirect()->route('home');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->forceFill([
            'password' => $validated['password'],
            'password_changed_at' => now(),
        ])->save();

        return back()->with('success', __('app.profile.password_saved'));
    }
}
