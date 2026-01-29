<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoPago extends Model
{
    protected $fillable = [
        'nombre',
        'codigo',
        'descripcion',
        'icono',
        'activo',
        'orden'
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer'
    ];

    // Scope para obtener solo tipos de pago activos
    public function scopeActivos($query)
    {
        return $query->where('activo', true)->orderBy('orden');
    }
}
