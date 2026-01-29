<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ContabilidadPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Resetear caché de permisos
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ============================================
        // PERMISOS DE CONTABILIDAD
        // ============================================

        $permissions = [
            // CAJAS
            'contabilidad.cajas.ver' => 'Ver cajas y reportes de caja',
            'contabilidad.cajas.crear' => 'Crear cajas y aperturar',
            'contabilidad.cajas.editar' => 'Editar cajas y cerrar',
            'contabilidad.cajas.eliminar' => 'Anular transacciones',

            // CAJA CHICA
            'contabilidad.caja_chica.ver' => 'Ver caja chica y rendiciones',
            'contabilidad.caja_chica.crear' => 'Crear caja chica y registrar gastos',
            'contabilidad.caja_chica.editar' => 'Editar gastos, aprobar y reponer',

            // FLUJO DE CAJA
            'contabilidad.flujo_caja.ver' => 'Ver flujo de caja y proyecciones',
            'contabilidad.flujo_caja.crear' => 'Crear proyecciones de flujo',
            'contabilidad.flujo_caja.editar' => 'Editar y registrar montos reales',
            'contabilidad.flujo_caja.eliminar' => 'Eliminar proyecciones',

            // KARDEX
            'contabilidad.kardex.ver' => 'Ver kardex e inventario valorizado',
            'contabilidad.kardex.ajustar' => 'Hacer ajustes de inventario',

            // CUENTAS POR COBRAR
            'contabilidad.cuentas-cobrar.ver' => 'Ver cuentas por cobrar',
            'contabilidad.cuentas-cobrar.crear' => 'Crear cuentas por cobrar',
            'contabilidad.cuentas-cobrar.pagar' => 'Registrar pagos de clientes',

            // CUENTAS POR PAGAR
            'contabilidad.cuentas-pagar.ver' => 'Ver cuentas por pagar',
            'contabilidad.cuentas-pagar.crear' => 'Crear cuentas por pagar',
            'contabilidad.cuentas-pagar.editar' => 'Editar cuentas por pagar',
            'contabilidad.cuentas-pagar.eliminar' => 'Eliminar cuentas por pagar',
            'contabilidad.cuentas-pagar.pagar' => 'Registrar pagos a proveedores',

            // PROVEEDORES
            'contabilidad.proveedores.ver' => 'Ver proveedores',
            'contabilidad.proveedores.crear' => 'Crear proveedores',
            'contabilidad.proveedores.editar' => 'Editar proveedores',

            // REPORTES
            'contabilidad.reportes.ver' => 'Ver todos los reportes contables',

            // UTILIDADES
            'contabilidad.utilidades.ver' => 'Ver utilidades y rentabilidad',
            'contabilidad.utilidades.crear' => 'Registrar gastos operativos',
            'contabilidad.utilidades.editar' => 'Calcular utilidades mensuales',
        ];

        // Crear permisos
        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'api']
            );
        }

        $this->command->info('✅ Permisos de contabilidad creados correctamente');

        // ============================================
        // ASIGNAR PERMISOS A ROLES
        // ============================================

        // ROL: Superadmin - Acceso total
        $superadminRole = Role::where('name', 'superadmin')->first();
        if ($superadminRole) {
            $superadminRole->givePermissionTo(array_keys($permissions));
            $this->command->info('✅ Permisos asignados al rol Superadmin');
        }

        // ROL: Administrador - Acceso total
        $adminRole = Role::where('name', 'Administrador')->first();
        if ($adminRole) {
            $adminRole->givePermissionTo(array_keys($permissions));
            $this->command->info('✅ Permisos asignados al rol Administrador');
        }

        // ROL: Gerente - Acceso total a contabilidad
        $gerenteRole = Role::where('name', 'Gerente')->first();
        if ($gerenteRole) {
            $gerenteRole->givePermissionTo(array_keys($permissions));
            $this->command->info('✅ Permisos asignados al rol Gerente');
        }

        // ROL: Contador - Acceso completo a contabilidad
        $contadorRole = Role::firstOrCreate(
            ['name' => 'Contador'],
            ['guard_name' => 'api']
        );
        $contadorRole->givePermissionTo(array_keys($permissions));
        $this->command->info('✅ Permisos asignados al rol Contador');

        // ROL: Cajero - Solo cajas
        $cajeroRole = Role::firstOrCreate(
            ['name' => 'Cajero'],
            ['guard_name' => 'api']
        );
        $cajeroRole->givePermissionTo([
            'contabilidad.cajas.ver',
            'contabilidad.cajas.crear',
            'contabilidad.cajas.editar',
        ]);
        $this->command->info('✅ Permisos asignados al rol Cajero');

        // ROL: Vendedor - Ver reportes y CxC
        $vendedorRole = Role::where('name', 'Vendedor')->where('guard_name', 'api')->first();
        if ($vendedorRole) {
            $vendedorRole->givePermissionTo([
                'contabilidad.cuentas-cobrar.ver',
                'contabilidad.cuentas-cobrar.pagar',
                'contabilidad.reportes.ver',
            ]);
            $this->command->info('✅ Permisos asignados al rol Vendedor');
        }

        // ROL: Compras - Proveedores y CxP
        $comprasRole = Role::firstOrCreate(
            ['name' => 'Compras'],
            ['guard_name' => 'api']
        );
        $comprasRole->givePermissionTo([
            'contabilidad.proveedores.ver',
            'contabilidad.proveedores.crear',
            'contabilidad.proveedores.editar',
            'contabilidad.cuentas-pagar.ver',
            'contabilidad.cuentas-pagar.crear',
            'contabilidad.cuentas-pagar.editar',
            'contabilidad.cuentas-pagar.pagar',
            'contabilidad.kardex.ver',
        ]);
        $this->command->info('✅ Permisos asignados al rol Compras');

        $this->command->info('');
        $this->command->info('🎉 Seeder de permisos de contabilidad completado');
    }
}
