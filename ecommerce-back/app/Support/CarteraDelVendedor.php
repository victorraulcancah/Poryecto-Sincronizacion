<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Cartera de clientes de un usuario del panel vinculado a un vendedor de Novik.
 *
 * La cadena es: `users.codigo_erp` (ej. "USR013") → `users.codigo` en Novik →
 * los `clients` que lo tienen como `ejecutivo_comercial_id`. Con esos códigos
 * se filtran las cotizaciones y pedidos, para que el vendedor solo vea los de
 * sus clientes.
 *
 * Se lee del ERP por la conexión `mysql_7power` (solo lectura).
 */
class CarteraDelVendedor
{
    /** La tienda corresponde a la empresa 1 del ERP. */
    private const COMPANY_ID = 1;

    /**
     * Solo se filtra a los Vendedores; el resto de roles ve todo.
     *
     * Lo que decide es el rol, no la vinculación. Antes un Vendedor sin
     * `codigo_erp` devolvía false y el controlador no filtraba nada, o sea que
     * quedaba viendo TODOS los pedidos y cotizaciones de la empresa. Sin
     * vinculación no hay cartera: `codigosDeCliente` devuelve vacío y quien
     * llama lo trata como "no ve ninguno".
     */
    public static function aplica(?User $usuario): bool
    {
        if (! $usuario) return false;

        return $usuario->roles->contains(
            fn ($rol) => mb_strtolower($rol->name) === ReglasDeRoles::VENDEDOR
        );
    }

    /**
     * Códigos de cliente de Novik que atiende este usuario.
     *
     * Devuelve un array vacío si no tiene ninguno: quien llama debe tratar eso
     * como "no ve nada", no como "ve todo".
     *
     * @return array<int,string>
     */
    public static function codigosDeCliente(User $usuario): array
    {
        if (! $usuario->codigo_erp) return [];

        try {
            $vendedorId = DB::connection('mysql_7power')->table('users')
                ->where('codigo', $usuario->codigo_erp)
                ->where('company_id', self::COMPANY_ID)
                ->value('id');

            if (! $vendedorId) return [];

            return DB::connection('mysql_7power')->table('clients')
                ->where('company_id', self::COMPANY_ID)
                ->where('ejecutivo_comercial_id', $vendedorId)
                ->whereNotNull('codigo')
                ->pluck('codigo')
                ->all();
        } catch (\Exception $e) {
            // Sin ERP no se puede saber la cartera: se prefiere no mostrar nada
            // antes que enseñarle al vendedor clientes que no son suyos.
            return [];
        }
    }
}
