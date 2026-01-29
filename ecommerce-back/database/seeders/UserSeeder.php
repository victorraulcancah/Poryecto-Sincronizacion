<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Admin Usuario',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Cliente Ejemplo',
            'email' => 'cliente@example.com',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Vendedor Test',
            'email' => 'vendedor@example.com',
            'password' => Hash::make('password'),
        ]);
    }
}