<?php

namespace App\Http\Controllers;

use App\Models\ChecklistItem;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ChecklistController extends Controller
{
    public function store(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('manageContent', $order);

        $validated = $request->validate(['text' => ['required', 'string', 'max:500']]);

        $order->checklist()->create([
            'text' => $validated['text'],
            'position' => (int) $order->checklist()->max('position') + 1,
        ]);
        $order->logEvent('checklist_added', ['text' => $validated['text']]);

        return back();
    }

    public function destroy(ChecklistItem $item): RedirectResponse
    {
        $order = $this->orderOf($item);
        Gate::authorize('manageContent', $order);

        $item->delete();
        $order->logEvent('checklist_removed', ['text' => $item->text]);

        return back();
    }

    /** Tick or untick; remembers who did it and when. */
    public function toggle(Request $request, ChecklistItem $item): RedirectResponse
    {
        $order = $this->orderOf($item);
        Gate::authorize('contribute', $order);

        $done = $item->done_at === null;
        $item->forceFill([
            'done_at' => $done ? now() : null,
            'done_by' => $done ? $request->user()->id : null,
        ])->save();
        $order->logEvent($done ? 'checklist_checked' : 'checklist_unchecked', ['text' => $item->text]);

        return back();
    }

    private function orderOf(ChecklistItem $item): Order
    {
        // Order has the company scope: another company's item resolves to null.
        return $item->order ?? abort(404);
    }
}
