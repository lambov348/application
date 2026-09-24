<?php

namespace App\Http\Middleware;

use App\Support\CurrentCompany;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Limits all company data to the signed-in user's company and signs out
 * users who were deactivated (or whose company was deactivated) at once.
 */
class SetCurrentCompany
{
    public function __construct(private CurrentCompany $company) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (! $user->is_active || ! $user->company?->is_active)) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            $user = null;

            if (! $request->routeIs('login')) {
                return redirect()->route('login')->with('status', __('app.auth.deactivated'));
            }
        }

        $this->company->set($user?->company_id);

        return $next($request);
    }
}
