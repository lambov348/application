<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One message to one person (push now, WhatsApp later), with its delivery state.
 */
class AppNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = ['user_id', 'channel', 'type', 'data', 'locale', 'status', 'attempts', 'sent_at', 'error'];

    protected function casts(): array
    {
        return ['data' => 'array', 'sent_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
