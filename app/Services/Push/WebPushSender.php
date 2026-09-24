<?php

namespace App\Services\Push;

use App\Models\PushSubscription;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushSender implements PushSender
{
    public function send(PushSubscription $subscription, array $payload): PushResult
    {
        $config = config('services.webpush');

        if (! $config['public_key'] || ! $config['private_key']) {
            return new PushResult(false, error: 'VAPID keys are not configured');
        }

        $webPush = new WebPush(['VAPID' => [
            'subject' => $config['subject'],
            'publicKey' => $config['public_key'],
            'privateKey' => $config['private_key'],
        ]], ['TTL' => 3600 * 12, 'urgency' => 'normal']);

        $report = $webPush->sendOneNotification(
            Subscription::create([
                'endpoint' => $subscription->token,
                'keys' => ['p256dh' => $subscription->p256dh, 'auth' => $subscription->auth],
            ]),
            json_encode($payload, JSON_UNESCAPED_UNICODE),
        );

        return new PushResult($report->isSuccess(), $report->isSubscriptionExpired(), $report->isSuccess() ? null : $report->getReason());
    }
}
