<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Models\Address;
use App\Models\Client;
use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderNumberGenerator;
use App\Support\CurrentCompany;
use Illuminate\Database\Seeder;

/**
 * Demo data for local development only. Never run in production.
 */
class DatabaseSeeder extends Seeder
{
    public function run(OrderNumberGenerator $numbers): void
    {
        if (Company::exists()) {
            $this->command?->info('Demo data already exists, skipping.');

            return;
        }

        $company = Company::create(['name' => 'MöbelStock24']);
        app(CurrentCompany::class)->set($company->id);

        $owner = $this->user($company, Role::Owner, 'Inhaber', 'admin', 'admin12345', changed: true);
        $dmitri = $this->user($company, Role::Worker, 'Dmitri K.', 'dmitri.k', 'start12345', changed: false, locale: 'ru');
        $oleg = $this->user($company, Role::Worker, 'Oleg S.', 'oleg.s', 'oleg12345', changed: true, locale: 'ru');
        $this->user($company, Role::Worker, 'Jonas W.', 'jonas.w', 'jonas12345', changed: true, locale: 'de');

        $becker = $this->client($company, 'Anna Becker', '+49 170 1234567', 'anna.becker@example.de', 'Lindenstraße 12', '10969', 'Berlin', '3', true, 'Hof, Einfahrt links');
        $schulz = $this->client($company, 'Thomas Schulz', '+49 151 7654321', 't.schulz@example.de', 'Karl-Marx-Allee 90', '10243', 'Berlin', '5', false, null);
        $ivanova = $this->client($company, 'Olga Ivanova', '+49 176 5550101', null, 'Hauptstraße 3', '14467', 'Potsdam', '0', null, 'Parkplatz vor dem Haus', 'ru');

        $today = now(config('app.display_timezone'))->toDateString();
        $tomorrow = now(config('app.display_timezone'))->addDay()->toDateString();

        $rows = [
            [$becker, 'Küchenmontage', 'Montage Küche 3,2 m: 7 Unter- und 5 Oberschränke, Spüle und Kochfeld einsetzen, Dunstabzug montieren. Alte Küche demontieren und entsorgen.', OrderStatus::InProgress, $today, '09:00', '15:00', 148000, 32300, [$dmitri, $oleg]],
            [$schulz, 'Schrankaufbau PAX', 'Zwei PAX-Kleiderschränke 2 m aufbauen und an der Wand befestigen.', OrderStatus::Scheduled, $tomorrow, '10:00', '13:00', 42000, 0, [$oleg]],
            [$ivanova, 'Umzug 2-Zimmer-Wohnung', 'Möbel ab- und aufbauen, Transport Potsdam → Berlin.', OrderStatus::New, null, null, null, 95000, 0, []],
        ];

        foreach ($rows as [$client, $title, $description, $status, $date, $start, $end, $price, $material, $workers]) {
            $order = new Order([
                'client_id' => $client->id,
                'address_id' => $client->addresses->first()->id,
                'title' => $title,
                'description' => $description,
                'date' => $date,
                'start_time' => $start,
                'end_time' => $end,
                'price_cents' => $price,
                'material_cents' => $material,
                'source' => 'Website',
                'payment_status' => PaymentStatus::Unpaid,
            ]);
            $order->company_id = $company->id;
            $order->number = $numbers->next($company->id);
            $order->status = $status;
            $order->save();
            $order->workers()->sync(collect($workers)->pluck('id'));
        }
    }

    private function user(Company $company, Role $role, string $name, string $login, string $password, bool $changed, string $locale = 'de'): User
    {
        $user = new User(['name' => $name, 'login' => $login, 'password' => $password, 'locale' => $locale]);
        $user->company_id = $company->id;
        $user->role = $role;
        $user->password_changed_at = $changed ? now() : null;
        $user->save();

        return $user;
    }

    private function client(Company $company, string $name, string $phone, ?string $email, string $street, string $zip, string $city, string $floor, ?bool $elevator, ?string $parking, string $locale = 'de'): Client
    {
        $client = Client::create(['name' => $name, 'phone' => $phone, 'email' => $email, 'locale' => $locale]);
        $client->addresses()->save(new Address([
            'street' => $street, 'zip' => $zip, 'city' => $city, 'floor' => $floor, 'has_elevator' => $elevator, 'parking_note' => $parking,
        ]));

        return $client->load('addresses');
    }
}
