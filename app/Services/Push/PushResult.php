<?php

namespace App\Services\Push;

final class PushResult
{
    public function __construct(
        public readonly bool $ok,
        /** The device unsubscribed or the endpoint no longer exists. */
        public readonly bool $expired = false,
        public readonly ?string $error = null,
    ) {}
}
