<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        if ($user->ics_token === null) {
            $user->forceFill(['ics_token' => Str::random(48)])->save();
        }

        $feed = route('calendar.feed', $user->ics_token);

        return Inertia::render('Profile/Edit', [
            'calendar' => [
                'url' => $feed,
                'webcal' => preg_replace('#^https?://#', 'webcal://', $feed),
            ],
            'push' => [
                'public_key' => config('services.webpush.public_key'),
                'devices' => $user->pushSubscriptions()->count(),
            ],
        ]);
    }
}
