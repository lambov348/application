<?php

namespace App\Support;

class Money
{
    /** Validated euro amount ("1480.5") → cents. */
    public static function toCents(null|string|int|float $euros): int
    {
        if ($euros === null || $euros === '') {
            return 0;
        }

        return (int) round(((float) $euros) * 100);
    }

    /** Cents → euro amount for form inputs ("1480.50"). */
    public static function toEuros(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
