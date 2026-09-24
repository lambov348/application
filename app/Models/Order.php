<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Concerns\BelongsToCompany;
use App\Observers\OrderObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy(OrderObserver::class)]
class Order extends Model
{
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id', 'address_id', 'title', 'description', 'date', 'start_time', 'end_time',
        'price_cents', 'material_cents', 'source', 'offer_no', 'payment_status',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'date' => 'date:Y-m-d',
            'price_cents' => 'integer',
            'material_cents' => 'integer',
            'paid_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function address(): BelongsTo
    {
        return $this->belongsTo(Address::class)->withTrashed();
    }

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'order_assignments')
            ->withPivot(['accepted_at', 'declined_at'])
            ->withTimestamps();
    }

    public function files(): HasMany
    {
        return $this->hasMany(OrderFile::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->latest('created_at')->latest('id');
    }

    public function isAssignedTo(User $user): bool
    {
        return $this->workers()->whereKey($user->id)->exists();
    }
}
