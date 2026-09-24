<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $locale = App::getLocale();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'login' => $user->login,
                    'role' => $user->role->value,
                    'locale' => $user->locale,
                ] : null,
            ],
            'locale' => $locale,
            'locales' => config('app.supported_locales'),
            'timezone' => config('app.display_timezone'),
            // Only the current language is sent to the browser.
            'translations' => fn () => trans('ui', [], $locale),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'status' => fn () => $request->session()->get('status'),
                'credentials' => fn () => $request->session()->get('credentials'),
            ],
        ];
    }
}
