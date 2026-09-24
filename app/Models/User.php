<?php

namespace App\Models;

use App\Enums\Role;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use BelongsToCompany, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['name', 'login', 'password', 'phone', 'locale', 'is_active'];

    protected $hidden = ['password', 'remember_token', 'ics_token'];

    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isOwner(): bool
    {
        return $this->role === Role::Owner;
    }

    public function isWorker(): bool
    {
        return $this->role === Role::Worker;
    }

    public function mustSetPassword(): bool
    {
        return $this->password_changed_at === null;
    }

    public function scopeWorkers(Builder $query): void
    {
        $query->where('role', Role::Worker);
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(Order::class, 'order_assignments')
            ->withPivot(['accepted_at', 'declined_at'])
            ->withTimestamps();
    }
}
