<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Un teléfono con el app instalado que recibe notificaciones push (ver la
 * migración de `dispositivos_cliente`).
 */
class DispositivoCliente extends Model
{
    protected $table = 'dispositivos_cliente';

    protected $fillable = ['user_cliente_id', 'token', 'plataforma', 'ultimo_uso_at'];

    protected $casts = ['ultimo_uso_at' => 'datetime'];
}
