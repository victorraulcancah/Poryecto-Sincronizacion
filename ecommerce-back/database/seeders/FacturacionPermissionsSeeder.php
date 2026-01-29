<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class FacturacionPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Resetear caché de permisos
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info('🔧 Creando permisos de Facturación Electrónica...');

        // ============================================
        // PERMISOS DE FACTURACIÓN
        // ============================================

        $permissions = [
            // COMPROBANTES
            'facturacion.comprobantes.ver' => 'Ver comprobantes electrónicos',
            'facturacion.comprobantes.show' => 'Ver detalle de comprobante',
            'facturacion.comprobantes.create' => 'Crear comprobantes',
            'facturacion.comprobantes.edit' => 'Reenviar y consultar comprobantes',
            'facturacion.comprobantes.delete' => 'Anular comprobantes',

            // FACTURAS
            'facturacion.facturas.ver' => 'Ver facturas',
            'facturacion.facturas.show' => 'Ver detalle de factura',
            'facturacion.facturas.create' => 'Crear facturas',
            'facturacion.facturas.edit' => 'Editar y enviar facturas a SUNAT',

            // SERIES
            'facturacion.series.ver' => 'Ver series de comprobantes',
            'facturacion.series.create' => 'Crear series',
            'facturacion.series.edit' => 'Editar series y reservar correlativos',

            // NOTAS DE CRÉDITO
            'facturacion.notas_credito.ver' => 'Ver notas de crédito',
            'facturacion.notas_credito.show' => 'Ver detalle de nota de crédito',
            'facturacion.notas_credito.create' => 'Crear notas de crédito',
            'facturacion.notas_credito.edit' => 'Enviar notas de crédito a SUNAT',

            // NOTAS DE DÉBITO
            'facturacion.notas_debito.ver' => 'Ver notas de débito',
            'facturacion.notas_debito.show' => 'Ver detalle de nota de débito',
            'facturacion.notas_debito.create' => 'Crear notas de débito',
            'facturacion.notas_debito.edit' => 'Enviar notas de débito a SUNAT',

            // GUÍAS DE REMISIÓN
            'facturacion.guias_remision.ver' => 'Ver guías de remisión',
            'facturacion.guias_remision.show' => 'Ver detalle de guía',
            'facturacion.guias_remision.create' => 'Crear guías de remisión',
            'facturacion.guias_remision.edit' => 'Enviar guías a SUNAT',
            'facturacion.guias_remision.delete' => 'Anular guías de remisión',
            'facturacion.guias_remision.pdf' => 'Generar PDF de guías',
            'facturacion.guias_remision.xml' => 'Descargar XML de guías',

            // CERTIFICADOS
            'facturacion.certificados.ver' => 'Ver certificados digitales',
            'facturacion.certificados.create' => 'Subir certificados',
            'facturacion.certificados.edit' => 'Activar/editar certificados',
            'facturacion.certificados.delete' => 'Eliminar certificados',

            // RESÚMENES Y BAJAS
            'facturacion.resumenes.ver' => 'Ver resúmenes diarios',
            'facturacion.resumenes.create' => 'Crear resúmenes',
            'facturacion.resumenes.edit' => 'Enviar resúmenes a SUNAT',

            'facturacion.bajas.ver' => 'Ver comunicaciones de baja',
            'facturacion.bajas.create' => 'Crear bajas',
            'facturacion.bajas.edit' => 'Enviar bajas a SUNAT',

            // AUDITORÍA Y REINTENTOS
            'facturacion.auditoria.ver' => 'Ver auditoría de SUNAT',
            'facturacion.reintentos.ver' => 'Ver reintentos fallidos',
            'facturacion.reintentos.edit' => 'Reintentar envíos a SUNAT',

            // CATÁLOGOS Y CONFIGURACIÓN
            'facturacion.catalogos.ver' => 'Ver catálogos SUNAT',
            'facturacion.empresa.ver' => 'Ver datos de empresa emisora',
            'facturacion.empresa.edit' => 'Editar datos de empresa emisora',

            // CONTINGENCIA
            'facturacion.contingencia.ver' => 'Ver estado de contingencia',
            'facturacion.contingencia.edit' => 'Activar/desactivar contingencia',

            // REPORTES
            'facturacion.reportes.ver' => 'Ver reportes de facturación',

            // PAGOS (NUEVOS)
            'facturacion.pagos.ver' => 'Ver pagos registrados',
            'facturacion.pagos.show' => 'Ver detalle de pago',
            'facturacion.pagos.create' => 'Registrar pagos',
            'facturacion.pagos.edit' => 'Editar pagos',
            'facturacion.pagos.delete' => 'Anular pagos',

            // HISTORIAL DE ENVÍOS (NUEVOS)
            'facturacion.historial_envios.ver' => 'Ver historial de envíos a SUNAT',
            'facturacion.historial_envios.edit' => 'Reenviar comprobantes',
            'facturacion.historial_envios.delete' => 'Limpiar logs antiguos',

            // LOGS (NUEVOS)
            'facturacion.logs.ver' => 'Ver logs del sistema',
            'facturacion.logs.create' => 'Crear logs y alertas',
            'facturacion.logs.edit' => 'Marcar logs como resueltos',
            'facturacion.logs.delete' => 'Limpiar logs antiguos',

            // CONFIGURACIÓN TRIBUTARIA (NUEVOS)
            'facturacion.configuracion.ver' => 'Ver configuración tributaria',
            'facturacion.configuracion.edit' => 'Editar configuración y validar credenciales',

            // INTEGRACIONES (NUEVOS)
            'facturacion.integraciones.ver' => 'Ver integraciones',
            'facturacion.integraciones.show' => 'Ver detalle de integración',
            'facturacion.integraciones.create' => 'Crear integraciones',
            'facturacion.integraciones.edit' => 'Editar y sincronizar integraciones',
            'facturacion.integraciones.delete' => 'Eliminar integraciones',
        ];

        // Crear permisos en ambos guards
        foreach ($permissions as $name => $description) {
            // Guard web
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['name' => $name, 'guard_name' => 'web']
            );
            
            // Guard api
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'api'],
                ['name' => $name, 'guard_name' => 'api']
            );
        }

        $this->command->info('✅ ' . count($permissions) . ' permisos de facturación creados');

        // ============================================
        // ASIGNAR PERMISOS A ROLES
        // ============================================

        $this->asignarPermisosARoles($permissions);

        $this->command->info('');
        $this->command->info('🎉 Seeder de permisos de facturación completado');
    }

    private function asignarPermisosARoles($permissions)
    {
        $permisosArray = array_keys($permissions);

        // ROL: superadmin - Acceso total (ambos guards)
        $superadminWeb = Role::where('name', 'superadmin')->where('guard_name', 'web')->first();
        $superadminApi = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
        
        if ($superadminWeb) {
            $superadminWeb->givePermissionTo($permisosArray);
            $this->command->info('✅ Permisos asignados a superadmin (web)');
        }
        
        if ($superadminApi) {
            $superadminApi->givePermissionTo($permisosArray);
            $this->command->info('✅ Permisos asignados a superadmin (api)');
        }

        // ROL: Administrador - Acceso total
        $adminWeb = Role::where('name', 'Administrador')->where('guard_name', 'web')->first();
        $adminApi = Role::where('name', 'Administrador')->where('guard_name', 'api')->first();
        
        if ($adminWeb) {
            $adminWeb->givePermissionTo($permisosArray);
            $this->command->info('✅ Permisos asignados a Administrador (web)');
        }
        
        if ($adminApi) {
            $adminApi->givePermissionTo($permisosArray);
            $this->command->info('✅ Permisos asignados a Administrador (api)');
        }

        // ROL: Contador - Acceso completo a facturación
        $contadorApi = Role::where('name', 'Contador')->where('guard_name', 'api')->first();
        if (!$contadorApi) {
            $contadorApi = Role::create(['name' => 'Contador', 'guard_name' => 'api']);
        }
        $contadorApi->givePermissionTo($permisosArray);
        $this->command->info('✅ Permisos asignados a Contador');

        // ROL: Vendedor - Solo ver y crear comprobantes
        $vendedorApi = Role::where('name', 'Vendedor')->where('guard_name', 'api')->first();
        if ($vendedorApi) {
            $vendedorApi->givePermissionTo([
                'facturacion.comprobantes.ver',
                'facturacion.comprobantes.show',
                'facturacion.comprobantes.create',
                'facturacion.facturas.ver',
                'facturacion.facturas.create',
                'facturacion.series.ver',
                'facturacion.reportes.ver',
                'facturacion.guias_remision.ver',
                'facturacion.guias_remision.show',
                'facturacion.guias_remision.create',
            ]);
            $this->command->info('✅ Permisos asignados a Vendedor');
        }

        // ROL: Cajero - Permisos de pagos y comprobantes
        $cajeroApi = Role::where('name', 'Cajero')->where('guard_name', 'api')->first();
        if (!$cajeroApi) {
            $cajeroApi = Role::create(['name' => 'Cajero', 'guard_name' => 'api']);
        }
        $cajeroApi->givePermissionTo([
            'facturacion.comprobantes.ver',
            'facturacion.comprobantes.show',
            'facturacion.comprobantes.create',
            'facturacion.facturas.ver',
            'facturacion.facturas.create',
            'facturacion.pagos.ver',
            'facturacion.pagos.show',
            'facturacion.pagos.create',
            'facturacion.series.ver',
        ]);
        $this->command->info('✅ Permisos asignados a Cajero');
    }
}
