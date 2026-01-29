<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        // Crear permisos
        $permissions = [
            // Usuarios
            'usuarios.ver',
            'usuarios.create',
            'usuarios.edit',
            'usuarios.delete',
            'usuarios.show',

            // Productos
            'productos.ver',
            'productos.create',
            'productos.edit',
            'productos.delete',

            // Categorías
            'categorias.ver',
            'categorias.create',
            'categorias.edit',
            'categorias.delete',

            // Marcas
            'marcas.ver',
            'marcas.create',
            'marcas.edit',
            'marcas.delete',

            // Secciones
            'secciones.ver',
            'secciones.create',
            'secciones.edit',
            'secciones.delete',

            // Banners
            'banners.ver',
            'banners.create',
            'banners.edit',
            'banners.delete',

            // Banners Promocionales
            'banners_promocionales.ver',
            'banners_promocionales.create',
            'banners_promocionales.edit',
            'banners_promocionales.delete',

            // Banners Flash Sales
            'banners_flash_sales.ver',
            'banners_flash_sales.create',
            'banners_flash_sales.edit',
            'banners_flash_sales.delete',

            // Banners Ofertas
            'banners_ofertas.ver',
            'banners_ofertas.create',
            'banners_ofertas.edit',
            'banners_ofertas.delete',

            // Clientes
            'clientes.ver',
            'clientes.show',
            'clientes.edit',
            'clientes.delete',

            // Pedidos
            'pedidos.ver',
            'pedidos.show',
            'pedidos.edit',
            'pedidos.delete',

            // Ofertas
            'ofertas.ver',
            'ofertas.create',
            'ofertas.edit',
            'ofertas.delete',

            // Cupones
            'cupones.ver',
            'cupones.create',
            'cupones.edit',
            'cupones.delete',
            // horarios
            'horarios.ver',
            'horarios.create',
            'horarios.edit',
            'horarios.delete',

            // Empresa Info
            'empresa_info.ver',
            'empresa_info.edit',

            // Reclamos
            'reclamos.ver',
            'reclamos.show',
            'reclamos.edit',
            'reclamos.delete',

            // Compras
            'compras.ver',
            'compras.show',
            'compras.edit',
            'compras.delete',
            'compras.aprobar',

            // Envío de correos
            'envio_correos.ver',
            'envio_correos.create',
            'envio_correos.edit',
            'envio_correos.delete',

            // Motorizados
            'motorizados.ver',
            'motorizados.show',
            'motorizados.create',
            'motorizados.edit',
            'motorizados.delete',

            // Permisos específicos para motorizados
            'pedidos.motorizado.ver',
            'pedidos.motorizado.actualizar_estado',
            'pedidos.motorizado.confirmar_entrega',
            'motorizado.perfil.ver',
            'motorizado.perfil.editar',
            'motorizado.rutas.ver',
            'motorizado.ubicacion.actualizar',
            'motorizado.estadisticas.ver',
            'motorizado.chat.ver',
            'motorizado.notificaciones.ver',

            // Cotizaciones
            'cotizaciones.ver',
            'cotizaciones.show',
            'cotizaciones.create',
            'cotizaciones.edit',
            'cotizaciones.delete',

            // Plantillas de Email
            'email_templates.ver',
            'email_templates.show',
            'email_templates.create',
            'email_templates.edit',
            'email_templates.delete',

            // Ventas
            'ventas.ver',
            'ventas.show',
            'ventas.create',
            'ventas.edit',
            'ventas.delete',

            // Roles
            'roles.ver',
            'roles.create',
            'roles.edit',
            'roles.delete',

            // Configuración (Formas de Envío y Tipos de Pago)
            'configuracion.ver',
            'configuracion.create',
            'configuracion.edit',
            'configuracion.delete',

        

        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ]);
        }

        // Crear roles si no existen
        $superadmin = Role::firstOrCreate([
            'name' => 'superadmin',
            'guard_name' => 'web'
        ]);

        // Asignar todos los permisos al superadmin
        $superadmin->givePermissionTo($permissions);
    }
}
