<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

/**
 * Order numbers look like 2026-0412: year and a running number per company and year.
 */
class OrderNumberGenerator
{
    /** Must be called inside a transaction. */
    public function next(int $companyId, ?int $year = null): string
    {
        $year ??= (int) now(config('app.display_timezone'))->format('Y');

        // Serialises number creation per company.
        Company::whereKey($companyId)->lockForUpdate()->first();

        $last = Order::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('number', 'like', $year.'-%')
            ->max(DB::raw("CAST(SPLIT_PART(number, '-', 2) AS INTEGER)"));

        return sprintf('%d-%04d', $year, ((int) $last) + 1);
    }
}
