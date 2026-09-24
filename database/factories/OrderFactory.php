<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    private static int $sequence = 0;

    public function definition(): array
    {
        return [
            'company_id' => fn (array $attributes) => Client::find($attributes['client_id'])->company_id,
            'client_id' => Client::factory(),
            'number' => sprintf('%d-%04d', now()->year, ++self::$sequence),
            'title' => fake()->randomElement(['Küchenmontage', 'Schrankaufbau', 'Umzug', 'Möbelmontage']),
            'description' => fake()->sentence(12),
            'status' => OrderStatus::New,
            'date' => null,
            'price_cents' => fake()->numberBetween(100, 2000) * 100,
            'material_cents' => 0,
            'payment_status' => PaymentStatus::Unpaid,
        ];
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(fn () => ['status' => $status, 'date' => now()->toDateString(), 'start_time' => '09:00', 'end_time' => '15:00']);
    }
}
