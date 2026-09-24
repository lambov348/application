<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Address extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['street', 'zip', 'city', 'floor', 'has_elevator', 'parking_note'];

    protected function casts(): array
    {
        return ['has_elevator' => 'boolean'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function oneLine(): string
    {
        return "{$this->street}, {$this->zip} {$this->city}";
    }
}
