<?php

use Illuminate\Support\Facades\Schedule;

// Runs every minute; each shift is closed at 23:59 in its company's timezone.
// Server needs: * * * * * php artisan schedule:run
Schedule::command('shifts:auto-close')->everyMinute()->withoutOverlapping();
