<?php

namespace App\Support;

/**
 * Holds the company of the signed-in user for the current request.
 * Models using BelongsToCompany are limited to this company.
 */
class CurrentCompany
{
    private ?int $id = null;

    public function set(?int $id): void
    {
        $this->id = $id;
    }

    public function id(): ?int
    {
        return $this->id;
    }
}
