<?php

namespace Database\Factories;

use App\Enums\OrderFileKind;
use App\Models\Order;
use App\Models\OrderFile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderFile>
 */
class OrderFileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'uploaded_by' => fn (array $attributes) => Order::find($attributes['order_id'])->workers()->value('users.id')
                ?? User::factory()->create(['company_id' => Order::find($attributes['order_id'])->company_id])->id,
            'kind' => OrderFileKind::After,
            'path' => 'orders/'.fake()->uuid().'.jpg',
            'size_bytes' => 250000,
            'mime' => 'image/jpeg',
        ];
    }
}
