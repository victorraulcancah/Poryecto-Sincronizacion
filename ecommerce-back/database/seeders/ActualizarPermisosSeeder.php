<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ActualizarPermisosSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Renombrar el permiso antiguo
        $permisoAntiguo = Permission::where('name', 'ver módulo usuarios')->first();
        if ($permisoAntiguo) {
            $permisoAntiguo->name = 'usuarios.ver';
            $permisoAntiguo->save();
        }

        // 2. Eliminar permisos antiguos no usados
        $aEliminar = [
            'ver módulo productos',
            'ver módulo categorías',
        ];

        foreach ($aEliminar as $nombre) {
            $permiso = Permission::where('name', $nombre)->first();
            if ($permiso) {
                $permiso->delete();
            }
        }

        // 3. Crear permisos nuevos estandarizados (excluye módulo Recompensas: centralizado en RecompensasPermisosSeeder)
        $permisosNuevos = [
            // Usuarios
            'usuarios.ver',
            'usuarios.create',
            'usuarios.show',
            'usuarios.edit',
            'usuarios.delete',

            // Productos
            'productos.ver',
            'productos.create',
            'productos.show',
            'productos.edit',
            'productos.delete',

            // Categorías
            'categorias.ver',
            'categorias.create',
            'categorias.show',
            'categorias.edit',
            'categorias.delete',

        ];

        foreach ($permisosNuevos as $permiso) {
            Permission::firstOrCreate([
                'name' => $permiso,
                'guard_name' => 'web',
            ]);
        }

        // 4. Asignar todos al superadmin (si existe)
        $superadmin = Role::where('name', 'superadmin')->first();
        if ($superadmin) {
            $superadmin->syncPermissions($permisosNuevos);
        }

        $this->command->info('Permisos actualizados correctamente.');
    }
}
