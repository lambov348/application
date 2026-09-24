<?php

namespace App\Models;

use App\Enums\PayModel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayRate extends Model
{
    protected $fillable = ['user_id', 'model', 'hourly_cents', 'per_job_cents', 'monthly_cents', 'valid_from', 'valid_to', 'created_by'];

    protected function casts(): array
    {
        return [
            'model' => PayModel::class,
            'valid_from' => 'date:Y-m-d',
            'valid_to' => 'date:Y-m-d',
            'hourly_cents' => 'integer',
            'per_job_cents' => 'integer',
            'monthly_cents' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function coversDate(string $ymd): bool
    {
        return $this->valid_from->format('Y-m-d') <= $ymd
            && ($this->valid_to === null || $this->valid_to->format('Y-m-d') >= $ymd);
    }
}
