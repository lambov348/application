<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'role' => Role::Worker,
            'name' => fake()->name(),
            'login' => Str::lower(fake()->unique()->userName()),
            'password' => static::$password ??= Hash::make('password'),
            'phone' => fake()->phoneNumber(),
            'locale' => 'de',
            'is_active' => true,
            'password_changed_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }

    public function owner(): static
    {
        return $this->state(fn () => ['role' => Role::Owner]);
    }

    public function worker(): static
    {
        return $this->state(fn () => ['role' => Role::Worker]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    /** Still has the start password from the owner. */
    public function withStartPassword(): static
    {
        return $this->state(fn () => ['password_changed_at' => null]);
    }

    public function forCompany(Company $company): static
    {
        return $this->state(fn () => ['company_id' => $company->id]);
    }
}
