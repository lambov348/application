<?php

namespace App\Enums;

enum PayModel: string
{
    case Hourly = 'hourly';
    case PerJob = 'per_job';
    case Mixed = 'mixed';
    case Fixed = 'fixed';

    public function paysHours(): bool
    {
        return $this === self::Hourly || $this === self::Mixed;
    }

    public function paysTrips(): bool
    {
        return $this === self::PerJob || $this === self::Mixed;
    }
}
