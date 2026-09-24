<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use BelongsToCompany;

    protected $fillable = ['company_id', 'year', 'month', 'status', 'closed_at', 'closed_by'];

    protected function casts(): array
    {
        return ['closed_at' => 'datetime', 'year' => 'integer', 'month' => 'integer'];
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(PayrollAdjustment::class, 'period_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(PayrollResult::class, 'period_id');
    }

    /** First and last calendar day of the month. */
    public function firstDay(): CarbonImmutable
    {
        return CarbonImmutable::create($this->year, $this->month, 1);
    }

    public function lastDay(): CarbonImmutable
    {
        return $this->firstDay()->endOfMonth()->startOfDay();
    }
}
