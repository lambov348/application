<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Interface language: the user's setting, otherwise the choice made on the
 * sign-in screen, otherwise the browser language.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('app.supported_locales');
        $user = $request->user();

        $locale = $user?->locale ?? $request->session()->get('locale');

        if (! in_array($locale, $supported, true)) {
            $locale = $request->getPreferredLanguage($supported) ?? config('app.locale');
        }

        // First sign-in: remember the language for this user.
        if ($user && $user->locale === null) {
            $user->forceFill(['locale' => $locale])->saveQuietly();
        }

        App::setLocale($locale);

        return $next($request);
    }
}
