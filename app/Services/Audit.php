<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class Audit
{
    public static function record(Model $entity, string $action, ?array $before = null, ?array $after = null, ?string $reason = null): void
    {
        AuditLog::create([
            'company_id' => $entity->company_id ?? Auth::user()?->company_id,
            'user_id' => Auth::id(),
            'entity' => $entity->getTable(),
            'entity_id' => $entity->getKey(),
            'action' => $action,
            'before' => $before,
            'after' => $after,
            'reason' => $reason,
        ]);
    }
}
