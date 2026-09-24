<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Frozen result of a closed month. Never recalculated.
 */
class PayrollResult extends Model
{
    protected $fillable = ['period_id', 'user_id', 'hours', 'trips', 'gross_cents', 'payable_cents', 'details'];

    protected function casts(): array
    {
        return ['details' => 'array', 'hours' => 'float', 'trips' => 'integer', 'gross_cents' => 'integer', 'payable_cents' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
