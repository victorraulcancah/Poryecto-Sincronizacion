<?php

namespace App\Support;

use App\Models\User;

/**
 * Reglas de la propuesta de roles, en un solo sitio para que el registro y la
 * edición de usuarios las apliquen igual.
 *
 *   - Al CEO no lo puede inhabilitar, editar ni eliminar nadie.
 *   - Solo un CEO puede asignar el rol CEO (el administrador crea usuarios,
 *     pero no CEOs).
 *   - Un Vendedor siempre tiene que quedar vinculado a un usuario de Novik:
 *     de esa vinculación depende qué cotizaciones ve.
 */
class ReglasDeRoles
{
    public const CEO = 'ceo';
    public const VENDEDOR = 'vendedor';

    /** El rol intocable, comparado sin distinguir mayúsculas. */
    public static function esCeo(?User $usuario): bool
    {
        if (! $usuario) return false;

        return $usuario->roles->contains(
            fn ($rol) => mb_strtolower($rol->name) === self::CEO
        );
    }

    public static function esNombreDeCeo(?string $rol): bool
    {
        return mb_strtolower(trim((string) $rol)) === self::CEO;
    }

    public static function esNombreDeVendedor(?string $rol): bool
    {
        return mb_strtolower(trim((string) $rol)) === self::VENDEDOR;
    }

    /**
     * Motivo por el que la acción no se puede hacer, o null si sí se puede.
     *
     * @param  User|null  $actor     quien está haciendo el cambio
     * @param  User       $objetivo  el usuario que se modifica
     */
    public static function motivoParaBloquearCambio(?User $actor, User $objetivo): ?string
    {
        if (self::esCeo($objetivo)) {
            return 'El usuario CEO no se puede editar, inhabilitar ni eliminar.';
        }

        return null;
    }

    /** Solo un CEO puede dejar a alguien como CEO. */
    public static function puedeAsignarRol(?User $actor, ?string $rol): bool
    {
        if (! self::esNombreDeCeo($rol)) return true;

        return self::esCeo($actor);
    }
}
