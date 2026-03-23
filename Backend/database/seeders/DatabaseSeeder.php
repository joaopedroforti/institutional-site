<?php

namespace Database\Seeders;

use App\Models\LeadKanbanColumn;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        LeadKanbanColumn::seedDefaults();

        User::query()->updateOrCreate([
            'username' => 'jpedroforti',
        ], [
            'name' => 'Joao Pedro Forti',
            'email' => 'jpedroforti@forticorp.com.br',
            'password' => Hash::make('18241214'),
            'is_super_admin' => true,
            'is_admin' => true,
            'is_seller' => true,
        ]);
    }
}
