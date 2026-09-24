<?php

namespace App\Enums;

enum OrderFileKind: string
{
    case Before = 'before';
    case After = 'after';
    case Plan = 'plan';
    case Document = 'document';
}
