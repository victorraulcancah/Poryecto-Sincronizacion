<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * Una cuenta, un dispositivo a la vez.
 *
 * Cada inicio de sesión (admin, cliente, motorizado, Google) pasa por aquí: se revocan los tokens que la cuenta
 * tuviera abiertos y se emite uno nuevo. El dispositivo anterior conserva su token en el navegador, pero Sanctum
 * ya no lo reconoce, así que su siguiente petición protegida recibe 401 "Unauthenticated." y el front lo manda al
 * login avisándole que la cuenta se abrió en otro lado.
 *
 * `$usuario->tokens()` es la relación morph del propio modelo (tipo + id), por lo que un admin y un cliente con el
 * mismo id numérico no se pisan entre sí.
 */
class SesionUnica
{
    /**
     * @param  Model  $usuario  Modelo con HasApiTokens (User, UserCliente, UserMotorizado).
     * @return string Token en texto plano para devolver al front.
     */
    public static function abrir(Model $usuario, string $nombreDelToken): string
    {
        $usuario->tokens()->delete();

        return $usuario->createToken($nombreDelToken)->plainTextToken;
    }
}
