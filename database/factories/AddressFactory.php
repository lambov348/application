<?php

namespace Database\Factories;

use App\Models\Address;
use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Address>
 */
class AddressFactory extends Factory
{
    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'street' => fake()->streetAddress(),
            'zip' => fake()->postcode(),
            'city' => fake()->city(),
            'floor' => (string) fake()->numberBetween(0, 6),
            'has_elevator' => fake()->boolean(),
            'parking_note' => null,
        ];
    }
}
