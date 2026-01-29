<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class MigrarRolesSpatieSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $usuarios = User::all();

        $rolesNecesarios = ['superadmin', 'admin', 'vendedor'];

        foreach ($rolesNecesarios as $rol) {
            Role::firstOrCreate(['name' => $rol, 'guard_name' => 'web']);
        }

        foreach ($usuarios as $user) {
            switch ($user->role_id) {
                case 1:
                    $user->assignRole('superadmin');
                    break;
                case 2:
                    $user->assignRole('admin');
                    break;
                case 3:
                    $user->assignRole('vendedor');
                    break;
                default:
                    // Puedes dejarlo sin rol o asignar uno por defecto
                    // $user->assignRole('invitado');
                    break;
            }
        }

        $this->command->info('Roles migrados exitosamente con Spatie.');
    }
}
