<?php

namespace App\Http\Controllers\Worker;

use App\Http\Controllers\Controller;
use App\Services\Shifts;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function start(Request $request, Shifts $shifts): RedirectResponse
    {
        $shifts->start($request->user());

        return back()->with('success', __('app.shifts.started'));
    }

    public function end(Request $request, Shifts $shifts): RedirectResponse
    {
        $shifts->end($request->user());

        return back()->with('success', __('app.shifts.ended'));
    }
}
