<?php

namespace App\Models;

use App\Enums\OrderFileKind;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrderFile extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['kind', 'path', 'thumb_path', 'size_bytes', 'mime', 'uploaded_by'];

    protected function casts(): array
    {
        return ['kind' => OrderFileKind::class];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
