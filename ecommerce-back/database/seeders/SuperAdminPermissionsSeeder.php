<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SuperAdminPermissionsSeeder extends Seeder
{
    /**
     * Asignar TODOS los permisos existentes al rol superadmin
     */
    public function run(): void
    {
        // Resetear caché de permisos
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info('🔍 Buscando rol superadmin...');

        // Buscar el rol superadmin (puede estar en cualquier guard)
        $superadminWeb = Role::where('name', 'superadmin')->where('guard_name', 'web')->first();
        $superadminApi = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
        
        // Si no existe en ningún guard, buscar sin especificar guard
        if (!$superadminWeb && !$superadminApi) {
            $superadmin = Role::where('name', 'superadmin')->first();
            if ($superadmin) {
                // Usar el guard que tenga
                if ($superadmin->guard_name === 'web') {
                    $superadminWeb = $superadmin;
                } else {
                    $superadminApi = $superadmin;
                }
            }
        }

        $this->command->info('✅ Roles superadmin encontrados');

        // Obtener TODOS los permisos de ambos guards
        $permissionsWeb = Permission::where('guard_name', 'web')->pluck('name')->toArray();
        $permissionsApi = Permission::where('guard_name', 'api')->pluck('name')->toArray();

        $this->command->info('');
        $this->command->info('📊 Permisos encontrados:');
        $this->command->info("   - Guard 'web': " . count($permissionsWeb) . " permisos");
        $this->command->info("   - Guard 'api': " . count($permissionsApi) . " permisos");

        // Asignar todos los permisos al superadmin
        if ($superadminWeb && count($permissionsWeb) > 0) {
            $superadminWeb->syncPermissions($permissionsWeb);
            $this->command->info('✅ Permisos (web) asignados a superadmin');
        }

        if ($superadminApi && count($permissionsApi) > 0) {
            $superadminApi->syncPermissions($permissionsApi);
            $this->command->info('✅ Permisos (api) asignados a superadmin');
        }

        $this->command->info('');
        $this->command->info('🎉 SuperAdmin ahora tiene acceso completo a:');
        $this->command->info('   ✓ Usuarios, Productos, Categorías, Marcas');
        $this->command->info('   ✓ Banners, Clientes, Pedidos, Ventas');
        $this->command->info('   ✓ Ofertas, Cupones, Cotizaciones, Compras');
        $this->command->info('   ✓ Recompensas (todos los submódulos)');
        $this->command->info('   ✓ Facturación (comprobantes, series, notas)');
        $this->command->info('   ✓ Contabilidad (cajas, kardex, cxc, cxp, reportes)');
        $this->command->info('');
        $this->command->info('💡 Recuerda ejecutar: php artisan cache:clear');
    }
}
