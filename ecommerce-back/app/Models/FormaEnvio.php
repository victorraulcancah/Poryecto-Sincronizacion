<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormaEnvio extends Model
{
    protected $fillable = [
        'nombre',
        'codigo',
        'descripcion',
        'costo',
        'activo',
        'orden'
    ];

    protected $casts = [
        'costo' => 'decimal:2',
        'activo' => 'boolean',
        'orden' => 'integer'
    ];

    // Scope para obtener solo formas de envío activas
    public function scopeActivas($query)
    {
        return $query->where('activo', true)->orderBy('orden');
    }
}
