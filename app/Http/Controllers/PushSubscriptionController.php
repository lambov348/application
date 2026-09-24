<?php

namespace App\Http\Controllers;

use App\Jobs\SendPushNotification;
use App\Models\AppNotification;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PushSubscriptionController extends Controller
{
    /** Save this device for push messages (or move it to the signed-in user). */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:2000', 'starts_with:https://'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);

        PushSubscription::updateOrCreate(
            ['token' => $validated['endpoint']],
            [
                'user_id' => $request->user()->id,
                'platform' => 'web',
                'p256dh' => $validated['keys']['p256dh'],
                'auth' => $validated['keys']['auth'],
                'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
            ],
        );

        return response()->noContent();
    }

    public function destroy(Request $request): Response
    {
        $request->validate(['endpoint' => ['required', 'string']]);

        $request->user()->pushSubscriptions()->where('token', $request->input('endpoint'))->delete();

        return response()->noContent();
    }

    public function test(Request $request): JsonResponse
    {
        $user = $request->user();

        // Sent to yourself on purpose, so bypass the "not to the actor" rule.
        $notification = AppNotification::create([
            'user_id' => $user->id,
            'type' => 'test',
            'data' => ['url' => route('profile.edit', absolute: false)],
            'locale' => $user->locale ?? config('app.locale'),
        ]);
        SendPushNotification::dispatch($notification->id);

        return response()->json(['devices' => $user->pushSubscriptions()->count()]);
    }
}
