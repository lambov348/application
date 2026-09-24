<?php

namespace App\Jobs;

use App\Models\AppNotification;
use App\Services\Push\PushSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Delivers one notification to all devices of its recipient.
 */
class SendPushNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> seconds between attempts */
    public array $backoff = [30, 120];

    public function __construct(public int $notificationId) {}

    public function handle(PushSender $sender): void
    {
        $notification = AppNotification::with('user.pushSubscriptions')->find($this->notificationId);

        if (! $notification || $notification->status === 'sent') {
            return;
        }

        $subscriptions = $notification->user?->pushSubscriptions ?? collect();

        if ($subscriptions->isEmpty()) {
            $notification->update(['status' => 'skipped', 'error' => 'no device']);

            return;
        }

        $payload = $this->payload($notification);
        $delivered = false;
        $errors = [];

        foreach ($subscriptions as $subscription) {
            $result = $sender->send($subscription, $payload);

            if ($result->expired) {
                $subscription->delete();
            } elseif ($result->ok) {
                $delivered = true;
            } else {
                $errors[] = $result->error;
            }
        }

        $notification->increment('attempts');

        if ($delivered) {
            $notification->update(['status' => 'sent', 'sent_at' => now(), 'error' => null]);

            return;
        }

        $notification->update(['status' => 'failed', 'error' => implode('; ', array_filter($errors)) ?: 'no active device']);

        if ($errors !== [] && $this->attempts() < $this->tries) {
            $this->release($this->backoff[$this->attempts() - 1] ?? 120);
        }
    }

    /** Title and text in the recipient's language. */
    private function payload(AppNotification $n): array
    {
        $data = $n->data ?? [];
        $replace = collect($data)->filter(fn ($v) => is_scalar($v))->all();

        return [
            'title' => __("app.push.{$n->type}.title", $replace, $n->locale),
            'body' => __("app.push.{$n->type}.body", $replace, $n->locale),
            'url' => $data['url'] ?? '/',
            'tag' => $n->type.'-'.($data['order_id'] ?? $n->id),
        ];
    }
}
