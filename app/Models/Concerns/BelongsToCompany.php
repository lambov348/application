<?php

namespace App\Models\Concerns;

use App\Models\Company;
use App\Support\CurrentCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $query) {
            $companyId = app(CurrentCompany::class)->id();

            if ($companyId !== null) {
                $query->where($query->getModel()->qualifyColumn('company_id'), $companyId);
            }
        });

        static::creating(function ($model) {
            $model->company_id ??= app(CurrentCompany::class)->id();
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
