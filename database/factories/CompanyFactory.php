<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'default_locale' => 'de',
            'timezone' => 'Europe/Berlin',
            'plan' => 'basic',
            'is_active' => true,
        ];
    }
}
