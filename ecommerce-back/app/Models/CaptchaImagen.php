<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Imagen que se usa para armar el rompecabezas del registro. */
class CaptchaImagen extends Model
{
    protected $table = 'captcha_imagenes';

    protected $fillable = [
        'nombre',
        'ruta',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function scopeActivas($query)
    {
        return $query->where('activo', true);
    }
}
