<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Mensaje enviado desde el formulario público de "Contáctanos".
 */
class MensajeContacto extends Model
{
    protected $table = 'mensajes_contacto';

    protected $fillable = [
        'nombre',
        'email',
        'telefono',
        'asunto',
        'mensaje',
        'ip',
        'leido',
    ];

    protected $casts = [
        'leido' => 'boolean',
    ];
}
