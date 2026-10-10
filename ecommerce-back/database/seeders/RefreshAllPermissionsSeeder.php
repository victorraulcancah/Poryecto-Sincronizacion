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
        $this->command->info('📦 [1/4] Ejecutando PermissionSeeder...');
        $this->call(PermissionSeeder::class);
        
        // 2. Permisos de Contabilidad
        $this->command->info('');
        $this->command->info('📦 [2/4] Ejecutando ContabilidadPermissionsSeeder...');
        $this->call(ContabilidadPermissionsSeeder::class);
        
        // 3. Permisos de Facturación
        $this->command->info('');
        $this->command->info('📦 [3/4] Ejecutando FacturacionPermissionsSeeder...');
        $this->call(FacturacionPermissionsSeeder::class);
        
        // 4. Asignar TODOS los permisos a SuperAdmin
        $this->command->info('');
        $this->command->info('📦 [4/4] Ejecutando SuperAdminPermissionsSeeder...');
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
