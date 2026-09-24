<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Time a worker spent on one order within a shift.
 */
class WorkLog extends Model
{
    protected $fillable = ['shift_id', 'order_id', 'user_id', 'started_at', 'ended_at'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function scopeOpen(Builder $query): void
    {
        $query->whereNull('ended_at');
    }

    public function seconds(): int
    {
        return (int) $this->started_at->diffInSeconds($this->ended_at ?? now());
    }
}
