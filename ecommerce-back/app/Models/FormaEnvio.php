<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormaEnvio extends Model
{
    protected $fillable = [
        'departamento_id',
        'provincia_id',
        'distrito_id',
        'costo',
        'activo',
    ];

    protected $casts = [
        'costo' => 'decimal:2',
        'activo' => 'boolean',
    ];

    // Scope para obtener solo formas de envío activas
    public function scopeActivas($query)
    {
        return $query->where('activo', true)->orderBy('id');
    }

    // Relaciones con ubigeo
    public function departamento()
    {
        return $this->belongsTo(\App\Models\Departamento::class, 'departamento_id', 'id');
    }

    public function provincia()
    {
        return $this->belongsTo(\App\Models\Provincia::class, 'provincia_id', 'id');
    }

    public function distrito()
    {
        return $this->belongsTo(\App\Models\Distrito::class, 'distrito_id', 'id');
    }
}
