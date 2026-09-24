<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use BelongsToCompany;

    public const UPDATED_AT = null;

    protected $table = 'audit_log';

    protected $fillable = ['company_id', 'user_id', 'entity', 'entity_id', 'action', 'before', 'after', 'reason'];

    protected function casts(): array
    {
        return ['before' => 'array', 'after' => 'array', 'created_at' => 'datetime'];
    }
}
