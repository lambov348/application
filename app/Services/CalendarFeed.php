<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Personal iCalendar (ICS) feed: workers get their own orders, the owner all orders.
 * No money is ever included.
 */
class CalendarFeed
{
    public function orders(User $user): Collection
    {
        $query = Order::withoutGlobalScopes()
            ->where('company_id', $user->company_id)
            ->whereNull('deleted_at')
            ->whereNotNull('date')
            ->where('status', '!=', OrderStatus::Rejected)
            ->where('date', '>=', now()->subDays(60)->toDateString())
            ->with(['client', 'address', 'workers']);

        if ($user->isWorker()) {
            $query->whereHas('workers', fn ($q) => $q->whereKey($user->id)->whereNull('order_assignments.declined_at'));
        }

        return $query->orderBy('date')->limit(1000)->get();
    }

    public function render(User $user): string
    {
        $tz = $user->company->timezone ?: config('app.display_timezone');
        $locale = $user->locale ?? config('app.locale');
        $host = parse_url(config('app.url'), PHP_URL_HOST) ?: 'moebelstock24';
        $stamp = gmdate('Ymd\THis\Z');

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MoebelStock24//Orders//'.strtoupper($locale),
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:'.$this->escape('MöbelStock24 · '.$user->name),
            'X-WR-TIMEZONE:'.$tz,
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
            ...$this->timezone($tz),
        ];

        foreach ($this->orders($user) as $order) {
            $lines = [...$lines, ...$this->event($order, $user, $tz, $locale, $host, $stamp)];
        }

        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", array_map($this->fold(...), $lines))."\r\n";
    }

    private function event(Order $order, User $user, string $tz, string $locale, string $host, string $stamp): array
    {
        $date = $order->date->format('Ymd');
        $t = fn (string $key, array $r = []) => __("app.calendar.{$key}", $r, $locale);

        if ($order->start_time) {
            $start = "DTSTART;TZID={$tz}:{$date}T".str_replace(':', '', substr($order->start_time, 0, 5)).'00';
            $endTime = $order->end_time ?: date('H:i', strtotime($order->start_time) + 3600);
            $end = "DTEND;TZID={$tz}:{$date}T".str_replace(':', '', substr($endTime, 0, 5)).'00';
        } else {
            $start = "DTSTART;VALUE=DATE:{$date}";
            $end = 'DTEND;VALUE=DATE:'.$order->date->copy()->addDay()->format('Ymd');
        }

        $address = $order->address;
        $details = array_filter([
            $t('client').': '.$order->client?->name.($order->client?->phone ? ' · '.$order->client->phone : ''),
            $address?->floor !== null ? $t('floor', ['floor' => $address->floor]) : null,
            $address?->has_elevator === null ? null : ($address->has_elevator ? $t('elevator_yes') : $t('elevator_no')),
            $address?->parking_note ? $t('parking', ['note' => $address->parking_note]) : null,
            $t('workers').': '.$order->workers->pluck('name')->implode(', '),
            $order->description,
        ]);

        $url = url($user->isOwner() ? route('admin.orders.show', $order, false) : route('worker.orders.show', $order, false));

        return array_filter([
            'BEGIN:VEVENT',
            "UID:order-{$order->id}@{$host}",
            "DTSTAMP:{$stamp}",
            $start,
            $end,
            'SUMMARY:'.$this->escape("#{$order->number} {$order->title}"),
            $address ? 'LOCATION:'.$this->escape($address->oneLine()) : null,
            'DESCRIPTION:'.$this->escape(implode("\n", $details)),
            'URL:'.$url,
            'STATUS:'.($order->status === OrderStatus::New ? 'TENTATIVE' : 'CONFIRMED'),
            'END:VEVENT',
        ]);
    }

    /** Rules for summer/winter time, so every calendar app shows the right hour. */
    private function timezone(string $tz): array
    {
        if ($tz !== 'Europe/Berlin') {
            return [];
        }

        return [
            'BEGIN:VTIMEZONE',
            'TZID:Europe/Berlin',
            'BEGIN:DAYLIGHT',
            'TZOFFSETFROM:+0100',
            'TZOFFSETTO:+0200',
            'TZNAME:CEST',
            'DTSTART:19700329T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
            'END:DAYLIGHT',
            'BEGIN:STANDARD',
            'TZOFFSETFROM:+0200',
            'TZOFFSETTO:+0100',
            'TZNAME:CET',
            'DTSTART:19701025T030000',
            'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
            'END:STANDARD',
            'END:VTIMEZONE',
        ];
    }

    private function escape(string $text): string
    {
        return str_replace(['\\', ';', ',', "\r\n", "\n"], ['\\\\', '\;', '\,', '\n', '\n'], $text);
    }

    /** Lines longer than 75 bytes are folded (RFC 5545). */
    private function fold(string $line): string
    {
        if (strlen($line) <= 75) {
            return $line;
        }

        $out = '';
        $current = '';
        foreach (mb_str_split($line) as $char) {
            if (strlen($current.$char) > ($out === '' ? 75 : 74)) {
                $out .= ($out === '' ? '' : "\r\n ").$current;
                $current = '';
            }
            $current .= $char;
        }

        return $out."\r\n ".$current;
    }
}
