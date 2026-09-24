<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\WorkerRequest;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WorkerController extends Controller
{
    private const AUDITED = ['name', 'login', 'phone', 'locale', 'is_active'];

    public function index(): Response
    {
        Gate::authorize('viewAny', User::class);

        return Inertia::render('Admin/Workers/Index', [
            'workers' => User::workers()
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (User $u) => [
                    ...$u->only(['id', 'name', 'login', 'phone', 'locale', 'is_active']),
                    'last_login_at' => $u->last_login_at?->toIso8601String(),
                    'must_set_password' => $u->mustSetPassword(),
                ]),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', User::class);

        return Inertia::render('Admin/Workers/Form', ['worker' => null]);
    }

    public function store(WorkerRequest $request): RedirectResponse
    {
        Gate::authorize('create', User::class);

        $password = $this->startPassword();

        $worker = DB::transaction(function () use ($request, $password) {
            $worker = new User([...$request->validated(), 'password' => $password]);
            $worker->company_id = $request->user()->company_id;
            $worker->role = Role::Worker;
            $worker->save();
            Audit::record($worker, 'created', after: $worker->only(self::AUDITED));

            return $worker;
        });

        return redirect()->route('admin.workers.index')->with('credentials', [
            'name' => $worker->name,
            'login' => $worker->login,
            'password' => $password,
        ]);
    }

    public function edit(User $worker): Response
    {
        Gate::authorize('update', $worker);

        return Inertia::render('Admin/Workers/Form', [
            'worker' => $worker->only(['id', 'name', 'login', 'phone', 'locale', 'is_active']),
        ]);
    }

    public function update(WorkerRequest $request, User $worker): RedirectResponse
    {
        Gate::authorize('update', $worker);

        $before = $worker->only(self::AUDITED);
        $worker->update($request->validated());
        Audit::record($worker, 'updated', $before, $worker->only(self::AUDITED));

        return redirect()->route('admin.workers.index')->with('success', __('app.saved'));
    }

    /** Deactivated workers lose access on their next click; their history stays. */
    public function toggleActive(User $worker): RedirectResponse
    {
        Gate::authorize('manageAccess', $worker);

        $worker->forceFill(['is_active' => ! $worker->is_active])->save();

        if (! $worker->is_active) {
            // Invalidate "remember me"; open sessions are ended by SetCurrentCompany.
            $worker->forceFill(['remember_token' => Str::random(60)])->save();
        }

        Audit::record($worker, $worker->is_active ? 'activated' : 'deactivated');

        return back()->with('success', __($worker->is_active ? 'app.workers.activated' : 'app.workers.deactivated', ['name' => $worker->name]));
    }

    /** New start password; the worker must choose their own on next sign-in. */
    public function resetPassword(User $worker): RedirectResponse
    {
        Gate::authorize('manageAccess', $worker);

        $password = $this->startPassword();

        $worker->forceFill(['password' => $password, 'password_changed_at' => null])->save();
        Audit::record($worker, 'password_reset');

        return back()->with('credentials', [
            'name' => $worker->name,
            'login' => $worker->login,
            'password' => $password,
        ]);
    }

    private function startPassword(): string
    {
        // No easily confused characters (0/O, 1/l/I) — it is read out or typed from paper.
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';

        return collect(range(1, 10))->map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)])->implode('');
    }
}
