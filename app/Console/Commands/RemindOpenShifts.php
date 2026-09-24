<?php

namespace App\Console\Commands;

use App\Models\Shift;
use App\Services\Notifier;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class RemindOpenShifts extends Command
{
    protected $signature = 'shifts:remind';

    protected $description = 'Push a reminder at 22:00 (company time) to everyone whose shift is still open';

    public function handle(Notifier $notifier): int
    {
        $now = CarbonImmutable::now();
        $count = 0;

        Shift::withoutGlobalScopes()->open()->whereNull('reminded_at')->with(['company', 'user'])->chunkById(100, function ($shifts) use ($now, $notifier, &$count) {
            foreach ($shifts as $shift) {
                $tz = $shift->company->timezone ?: config('app.display_timezone');
                $due = CarbonImmutable::parse($shift->started_at)->setTimezone($tz)->setTime(22, 0);

                if ($now->greaterThanOrEqualTo($due)) {
                    $shift->forceFill(['reminded_at' => $now])->save();
                    $notifier->notify($shift->user, 'shift_open', ['url' => route('worker.orders.index', absolute: false)]);
                    $count++;
                }
            }
        });

        $this->info("Reminded {$count} worker(s).");

        return self::SUCCESS;
    }
}
