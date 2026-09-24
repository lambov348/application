<?php

namespace App\Console\Commands;

use App\Services\Shifts;
use Illuminate\Console\Command;

class AutoCloseShifts extends Command
{
    protected $signature = 'shifts:auto-close';

    protected $description = 'Close shifts still open at 23:59 (company time) and mark them for review';

    public function handle(Shifts $shifts): int
    {
        $count = $shifts->autoCloseDue();
        $this->info("Closed {$count} shift(s).");

        return self::SUCCESS;
    }
}
