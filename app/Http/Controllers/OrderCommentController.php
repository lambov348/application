<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrderCommentController extends Controller
{
    public function store(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('contribute', $order);

        $validated = $request->validate(['text' => ['required', 'string', 'max:5000']]);

        $order->comments()->create(['user_id' => $request->user()->id, 'text' => $validated['text']]);
        $order->logEvent('comment_added');

        return back()->with('success', __('app.comments.sent'));
    }
}
