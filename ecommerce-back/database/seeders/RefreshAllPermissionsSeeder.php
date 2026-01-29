<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class RefreshAllPermissionsSeeder extends Seeder
{
    /**
     * Ejecutar todos los seeders de permisos en orden
     */
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('╔════════════════════════════════════════════════════════╗');
        $this->command->info('║   🔄 ACTUALIZANDO TODOS LOS PERMISOS DEL SISTEMA      ║');
        $this->command->info('╚════════════════════════════════════════════════════════╝');
        $this->command->info('');

        // 1. Permisos básicos
        $this->command->info('📦 [1/5] Ejecutando PermissionSeeder...');
        $this->call(PermissionSeeder::class);
        
        // 2. Permisos de Contabilidad
        $this->command->info('');
        $this->command->info('📦 [2/5] Ejecutando ContabilidadPermissionsSeeder...');
        $this->call(ContabilidadPermissionsSeeder::class);
        
        // 3. Permisos de Facturación
        $this->command->info('');
        $this->command->info('📦 [3/5] Ejecutando FacturacionPermissionsSeeder...');
        $this->call(FacturacionPermissionsSeeder::class);
        
        // 4. Permisos de Recompensas (si existe)
        if (class_exists(\Database\Seeders\RecompensasPermisosSeeder::class)) {
            $this->command->info('');
            $this->command->info('📦 [4/5] Ejecutando RecompensasPermisosSeeder...');
            $this->call(RecompensasPermisosSeeder::class);
        }
        
        // 5. Asignar TODOS los permisos a SuperAdmin
        $this->command->info('');
        $this->command->info('📦 [5/5] Ejecutando SuperAdminPermissionsSeeder...');
        $this->call(SuperAdminPermissionsSeeder::class);

        $this->command->info('');
        $this->command->info('╔════════════════════════════════════════════════════════╗');
        $this->command->info('║   ✅ TODOS LOS PERMISOS ACTUALIZADOS CORRECTAMENTE    ║');
        $this->command->info('╚════════════════════════════════════════════════════════╝');
        $this->command->info('');
        $this->command->info('💡 Próximos pasos:');
        $this->command->info('   1. php artisan cache:clear');
        $this->command->info('   2. php artisan config:clear');
        $this->command->info('   3. Volver a iniciar sesión en el frontend');
        $this->command->info('   4. Llamar a GET /api/refresh-permissions');
        $this->command->info('');
    }
}
