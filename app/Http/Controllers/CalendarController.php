<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\CalendarFeed;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class CalendarController extends Controller
{
    /** Public feed for calendar apps; the long secret in the link is the only key. */
    public function feed(string $token, CalendarFeed $feed): Response
    {
        $user = User::withoutGlobalScopes()
            ->where('ics_token', $token)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->with('company')
            ->first();

        abort_if(! $user || ! $user->company?->is_active, 404);

        return response($feed->render($user), 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="moebelstock24.ics"',
            'Cache-Control' => 'private, max-age=900',
        ]);
    }

    /** New secret link; the old one stops working at once. */
    public function regenerate(Request $request): RedirectResponse
    {
        $request->user()->forceFill(['ics_token' => Str::random(48)])->save();

        return back()->with('success', __('app.calendar.regenerated'));
    }
}
