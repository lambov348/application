<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeys extends Command
{
    protected $signature = 'webpush:vapid {--write : Write the keys into .env if they are empty}';

    protected $description = 'Create the key pair for Web Push notifications';

    public function handle(): int
    {
        $keys = VAPID::createVapidKeys();

        if (! $this->option('write')) {
            $this->line("VAPID_PUBLIC_KEY={$keys['publicKey']}");
            $this->line("VAPID_PRIVATE_KEY={$keys['privateKey']}");

            return self::SUCCESS;
        }

        $path = base_path('.env');
        $env = file_get_contents($path);

        if (preg_match('/^VAPID_PRIVATE_KEY=.+$/m', $env)) {
            $this->info('Keys already set, nothing changed.');

            return self::SUCCESS;
        }

        foreach (['VAPID_PUBLIC_KEY' => $keys['publicKey'], 'VAPID_PRIVATE_KEY' => $keys['privateKey']] as $key => $value) {
            $env = preg_match("/^{$key}=.*$/m", $env)
                ? preg_replace("/^{$key}=.*$/m", "{$key}={$value}", $env)
                : rtrim($env)."\n{$key}={$value}\n";
        }

        file_put_contents($path, $env);
        $this->info('Keys written to .env.');

        return self::SUCCESS;
    }
}
