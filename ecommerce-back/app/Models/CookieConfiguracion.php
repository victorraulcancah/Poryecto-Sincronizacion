<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CookieConfiguracion extends Model
{
    use HasFactory;

    protected $table = 'cookie_configuracion';

    protected $fillable = [
        'activo',
        'mensaje',
        'boton_aceptar_texto',
        'boton_rechazar_texto',
        'boton_configurar_texto',
        'link_politica_texto',
        'link_politica_url',
        'mostrar_boton_rechazar',
        'mostrar_boton_configurar',
        'posicion'
    ];

    protected $casts = [
        'activo' => 'boolean',
        'mostrar_boton_rechazar' => 'boolean',
        'mostrar_boton_configurar' => 'boolean',
    ];
}
