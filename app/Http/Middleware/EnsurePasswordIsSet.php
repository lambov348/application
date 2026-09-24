<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * On first sign-in the user must replace the start password from the owner.
 */
class EnsurePasswordIsSet
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->mustSetPassword()) {
            return redirect()->route('password.setup');
        }

        return $next($request);
    }
}
