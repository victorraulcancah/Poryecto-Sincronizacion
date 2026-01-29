<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class CopyPermissionsToApiGuard extends Seeder
{
    /**
     * Copiar todos los permisos de guard 'web' a guard 'api'
     * y asignarlos al usuario superadmin
     */
    public function run(): void
    {
        $this->command->info('🔄 Copiando permisos de guard web a api...');

        // Obtener todos los permisos de guard 'web'
        $webPermissions = Permission::where('guard_name', 'web')->get();

        $this->command->info("📋 Encontrados {$webPermissions->count()} permisos en guard 'web'");

        $copied = 0;
        $existing = 0;

        // Copiar cada permiso a guard 'api'
        foreach ($webPermissions as $perm) {
            $apiPerm = Permission::where('name', $perm->name)
                ->where('guard_name', 'api')
                ->first();

            if (! $apiPerm) {
                Permission::create([
                    'name' => $perm->name,
                    'guard_name' => 'api',
                ]);
                $copied++;
            } else {
                $existing++;
            }
        }

        $this->command->info("✅ Permisos copiados: {$copied}");
        $this->command->info("ℹ️  Permisos que ya existían: {$existing}");

        // Asignar TODOS los permisos de guard 'api' al usuario superadmin
        $this->command->info('');
        $this->command->info('👤 Asignando permisos al usuario superadmin...');

        $user = User::where('email', 'admin@example.com')->first();

        if (! $user) {
            $this->command->error('❌ Usuario admin@example.com no encontrado');

            return;
        }

        // Obtener TODOS los permisos de guard 'api'
        $allApiPermissions = Permission::where('guard_name', 'api')->get();

        $this->command->info("📊 Total de permisos en guard 'api': ".$allApiPermissions->count());

        // Asignar permisos directamente al usuario usando givePermissionTo
        // que NO borra los permisos existentes
        foreach ($allApiPermissions as $permission) {
            try {
                $user->givePermissionTo($permission);
            } catch (\Exception $e) {
                // Ignorar si ya tiene el permiso
            }
        }
        
        // TAMBIÉN asignar permisos de guard 'web'
        $this->command->info('');
        $this->command->info('👤 Asignando permisos de guard web...');
        
        $allWebPermissions = Permission::where('guard_name', 'web')->get();
        $this->command->info("📊 Total de permisos en guard 'web': ".$allWebPermissions->count());
        
        foreach ($allWebPermissions as $permission) {
            try {
                $user->givePermissionTo($permission);
            } catch (\Exception $e) {
                // Ignorar si ya tiene el permiso
            }
        }

        // Limpiar caché
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info('✅ Permisos asignados correctamente');
        $this->command->info('');
        $this->command->info('🎉 Proceso completado');
        $this->command->info('');
        $this->command->info('⚠️  IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar sesión');
    }
}
