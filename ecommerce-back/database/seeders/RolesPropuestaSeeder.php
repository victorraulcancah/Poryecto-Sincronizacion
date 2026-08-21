<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Roles del panel según la propuesta de "vinculación usuario".
 *
 *   ceo               nadie lo puede inhabilitar ni editar
 *   administrador     todos los módulos; agrega usuarios (menos CEO); vincula clientes
 *   contabilidad      por ahora solo ver cotizaciones
 *   community manager edita todo, no agrega usuarios
 *   marketing         por ahora solo ver cotizaciones
 *   jefe comercial    ver cotizaciones y vincular clientes
 *   vendedor          solo pedidos; siempre con vinculación a Novik
 *
 * Solo toca estos siete roles: los que ya existían (superadmin, admin,
 * motorizado, Contador, Cajero, Compras, Gerente) se quedan como están.
 *
 *   php artisan db:seed --class=RolesPropuestaSeeder
 */
class RolesPropuestaSeeder extends Seeder
{
    /** Los roles del panel viven en el guard `api`. */
    private const GUARD = 'api';

    public function run(): void
    {
        $todos = Permission::where('guard_name', self::GUARD)
            ->pluck('name')
            ->unique()
            ->values()
            ->all();

        // "Editar todo pero no agregar usuarios": se le quita la gestión de
        // usuarios y de roles, el resto de módulos queda igual que al admin.
        $sinGestionDeUsuarios = array_values(array_filter(
            $todos,
            fn ($p) => ! str_starts_with($p, 'usuarios.')
                && ! str_starts_with($p, 'roles.')
                && ! str_starts_with($p, 'admin.usuarios.')
                && ! str_starts_with($p, 'admin.roles.')
                && ! str_starts_with($p, 'admin.permisos.')
        ));

        // "Por ahora solo pueden ver cotización".
        $soloCotizaciones = ['cotizaciones.ver', 'cotizaciones.show'];

        // Igual que el anterior más lo necesario para vincular clientes.
        $cotizacionesYVincular = array_merge($soloCotizaciones, [
            'clientes.ver',
            'clientes.show',
            'clientes.edit',
        ]);

        // El vendedor solo entra a pedidos; las cotizaciones que ve se filtran
        // por su cartera (ver CotizacionesController).
        $soloPedidos = [
            'pedidos.ver',
            'pedidos.show',
            'pedidos.edit',
            'cotizaciones.ver',
            'cotizaciones.show',
        ];

        $roles = [
            'ceo' => $todos,
            'administrador' => $todos,
            'contabilidad' => $soloCotizaciones,
            'community manager' => $sinGestionDeUsuarios,
            'marketing' => $soloCotizaciones,
            'jefe comercial' => $cotizacionesYVincular,
            'vendedor' => $soloPedidos,
        ];

        foreach ($roles as $nombre => $permisos) {
            $rol = $this->rolePorNombre($nombre);

            // Solo se sincronizan los permisos que existan en el guard, para
            // que el seeder no reviente si un módulo aún no está instalado.
            $existentes = Permission::where('guard_name', self::GUARD)
                ->whereIn('name', $permisos)
                ->get();

            $rol->syncPermissions($existentes);

            $this->command->info(sprintf(
                '  %-20s %d permisos',
                $nombre,
                $existentes->count()
            ));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Busca el rol sin distinguir mayúsculas para no terminar con
     * "Administrador" y "administrador" como dos roles distintos.
     */
    private function rolePorNombre(string $nombre): Role
    {
        $existente = Role::where('guard_name', self::GUARD)
            ->get()
            ->first(fn ($r) => mb_strtolower($r->name) === mb_strtolower($nombre));

        if ($existente) return $existente;

        return Role::create(['name' => $nombre, 'guard_name' => self::GUARD]);
    }
}
