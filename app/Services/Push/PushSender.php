<?php

namespace App\Services\Push;

use App\Models\PushSubscription;

interface PushSender
{
    /**
     * Send one message to one device.
     */
    public function send(PushSubscription $subscription, array $payload): PushResult;
}
