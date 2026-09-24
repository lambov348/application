<?php

namespace App\Models;

use App\Enums\AdjustmentType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollAdjustment extends Model
{
    use SoftDeletes;

    protected $fillable = ['period_id', 'user_id', 'type', 'amount_cents', 'reason', 'created_by'];

    protected function casts(): array
    {
        return ['type' => AdjustmentType::class, 'amount_cents' => 'integer'];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'period_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }
}
