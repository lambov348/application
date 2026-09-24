<?php

namespace App\Enums;

enum OrderStatus: string
{
    case New = 'new';
    case Scheduled = 'scheduled';
    case Confirmed = 'confirmed';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Paid = 'paid';
    case Rejected = 'rejected';

    /**
     * Statuses this one may move to.
     *
     * @return list<self>
     */
    public function next(): array
    {
        return match ($this) {
            self::New => [self::Scheduled, self::Rejected],
            self::Scheduled => [self::Confirmed, self::Rejected],
            self::Confirmed => [self::InProgress],
            self::InProgress => [self::Completed],
            self::Completed => [self::Paid],
            self::Paid, self::Rejected => [],
        };
    }

    public function canMoveTo(self $to): bool
    {
        return in_array($to, $this->next(), true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
