<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        return $request->user()->isOwner()
            ? redirect()->route('admin.orders.index')
            : redirect()->route('worker.orders.index');
    }
}
