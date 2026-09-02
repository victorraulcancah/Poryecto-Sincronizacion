<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Roles del panel y qué puede hacer cada uno.
 *
 * Va como migración y no cargando filas a mano para que exista en todos los
 * entornos: los roles se habían creado directo en la base de desarrollo y en
 * producción no aparecían. Volver a correrla no duplica nada.
 *
 * Reglas que NO viven acá porque no son permisos sino comportamiento, y están
 * en App\Support\ReglasDeRoles:
 *   - Al CEO no lo puede editar, inhabilitar ni eliminar nadie.
 *   - Solo un CEO puede asignar el rol CEO (el administrador crea usuarios,
 *     pero nunca otro CEO).
 *   - Un Vendedor tiene que quedar siempre vinculado a un usuario de Novik: de
 *     esa vinculación depende qué pedidos ve.
 */
return new class extends Migration
{
    /** Guard con el que trabaja el panel. */
    private const GUARD = 'api';

    /** Permisos de administración de usuarios, roles y permisos. */
    private const GESTION_DE_USUARIOS = [
        'usuarios.ver', 'usuarios.show', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
        'admin.usuarios.ver', 'admin.usuarios.crear', 'admin.usuarios.editar', 'admin.usuarios.eliminar',
        'admin.roles.ver', 'admin.roles.crear', 'admin.roles.editar', 'admin.roles.eliminar',
        'admin.permisos.ver', 'admin.permisos.asignar',
    ];

    private const SOLO_COTIZACIONES = ['cotizaciones.ver', 'cotizaciones.show'];

    /** Ver clientes y vincularlos con el ERP. */
    private const VINCULAR_CLIENTES = ['clientes.ver', 'clientes.show', 'clientes.edit'];

    public function up(): void
    {
        $todos = Permission::where('guard_name', self::GUARD)->pluck('name')->unique()->all();

        foreach ($this->permisosPorRol($todos) as $nombre => $permisos) {
            $rol = Role::firstOrCreate(['name' => $nombre, 'guard_name' => self::GUARD]);

            // `sync` y no `give`: la migración deja el rol exactamente como se
            // define acá, sin arrastrar permisos sueltos de pruebas anteriores.
            $rol->syncPermissions($permisos);
        }
    }

    /**
     * @param  string[]  $todos  todos los permisos existentes
     * @return array<string,string[]>
     */
    private function permisosPorRol(array $todos): array
    {
        return [
            // Acceso total. Además es intocable (ver ReglasDeRoles).
            'ceo' => $todos,

            // Entra a todos los módulos y da de alta usuarios; que no pueda
            // crear otro CEO lo impide ReglasDeRoles, no un permiso.
            'administrador' => $todos,

            // Edita todo el contenido, pero no toca usuarios ni roles.
            'community manager' => array_values(array_diff($todos, self::GESTION_DE_USUARIOS)),

            // Por ahora solo consultan cotizaciones.
            'contabilidad' => self::SOLO_COTIZACIONES,
            'marketing' => self::SOLO_COTIZACIONES,

            // Cotizaciones y, además, vincular clientes con el ERP.
            'jefe comercial' => array_merge(self::SOLO_COTIZACIONES, self::VINCULAR_CLIENTES),

            // Pedidos y cotizaciones, y solo los de su cartera: eso lo resuelve
            // CarteraDelVendedor a partir de su vinculación con Novik.
            //
            // Las cotizaciones van incluidas porque CotizacionesController filtra
            // por cartera para este rol: ese código solo tiene sentido si el
            // vendedor entra a esa pantalla.
            'vendedor' => ['pedidos.ver', 'pedidos.show', 'cotizaciones.ver', 'cotizaciones.show'],
        ];
    }

    public function down(): void
    {
        // Solo se van los roles que esta migración introdujo. `vendedor` no se
        // toca: existía antes y tiene usuarios asignados.
        Role::whereIn('name', ['ceo', 'administrador', 'community manager', 'contabilidad', 'marketing', 'jefe comercial'])
            ->where('guard_name', self::GUARD)
            ->get()
            ->each
            ->delete();
    }
};
