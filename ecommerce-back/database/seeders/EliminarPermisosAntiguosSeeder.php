<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class EliminarPermisosAntiguosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permisosAntiguos = [
            'ver usuarios',
            'registrar usuarios',
            'editar usuarios',
            'eliminar usuarios',

            'ver producto',
            'registrar producto',
            'editar producto',
            'eliminar producto',

            'ver categoría',
            'registrar categoría',
            'editar categoría',
            'eliminar categoría',
        ];

        foreach ($permisosAntiguos as $permiso) {
            $permisoModel = Permission::where('name', $permiso)->first();
            if ($permisoModel) {
                $permisoModel->delete();
                $this->command->info("Permiso eliminado: {$permiso}");
            } else {
                $this->command->warn("Permiso no encontrado (ya eliminado): {$permiso}");
            }
        }

        $this->command->info('✅ Permisos antiguos eliminados correctamente.');

    }
}
