<?php

namespace App\Policies;

use App\Models\User;

/**
 * Managing worker accounts. Only the owner does this.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isOwner();
    }

    public function view(User $user, User $worker): bool
    {
        return $user->isOwner() && $user->company_id === $worker->company_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner();
    }

    public function update(User $user, User $worker): bool
    {
        return $this->view($user, $worker);
    }

    /** Deactivate, reactivate or reset the password. The owner cannot lock themselves out. */
    public function manageAccess(User $user, User $worker): bool
    {
        return $this->view($user, $worker) && $user->id !== $worker->id;
    }
}
