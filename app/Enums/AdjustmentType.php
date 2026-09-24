<?php

namespace App\Enums;

enum AdjustmentType: string
{
    case Bonus = 'bonus';
    case Deduction = 'deduction';
    case Advance = 'advance';
}
