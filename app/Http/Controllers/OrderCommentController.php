<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class OrderCommentController extends Controller
{
    public function store(Request $request, Order $order, Notifier $notifier): RedirectResponse
    {
        Gate::authorize('contribute', $order);

        $validated = $request->validate(['text' => ['required', 'string', 'max:5000']]);

        $order->comments()->create(['user_id' => $request->user()->id, 'text' => $validated['text']]);
        $order->logEvent('comment_added');

        if ($request->user()->isWorker()) {
            $notifier->ownersOf($order, 'new_comment', [
                'worker' => $request->user()->name,
                'text' => Str::limit($validated['text'], 120),
            ]);
        }

        return back()->with('success', __('app.comments.sent'));
    }
}
