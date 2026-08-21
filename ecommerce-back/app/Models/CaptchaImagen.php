<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Imagen que se usa para armar el rompecabezas del registro. */
class CaptchaImagen extends Model
{
    protected $table = 'captcha_imagenes';

    /** En cuántas piezas se puede partir una imagen. */
    public const PIEZAS_VALIDAS = [2, 4, 6, 8];

    /** Columnas y filas de cada opción: 2→2×1, 4→2×2, 6→3×2, 8→4×2. */
    public const CUADRICULA = [
        2 => ['columnas' => 2, 'filas' => 1],
        4 => ['columnas' => 2, 'filas' => 2],
        6 => ['columnas' => 3, 'filas' => 2],
        8 => ['columnas' => 4, 'filas' => 2],
    ];

    protected $fillable = [
        'nombre',
        'ruta',
        'piezas',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'piezas' => 'integer',
    ];

    /** Cuadrícula que corresponde a las piezas de esta imagen. */
    public function cuadricula(): array
    {
        return self::CUADRICULA[$this->piezas] ?? self::CUADRICULA[4];
    }

    public function scopeActivas($query)
    {
        return $query->where('activo', true);
    }
}
