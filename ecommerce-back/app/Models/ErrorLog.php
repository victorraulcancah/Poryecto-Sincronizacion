<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ErrorLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo',
        'nivel',
        'modulo',
        'mensaje',
        'detalle',
        'contexto',
        'user_id',
        'ip',
        'user_agent',
        'resuelto',
        'resuelto_por',
        'resuelto_en',
        'solucion'
    ];

    protected $casts = [
        'contexto' => 'array',
        'resuelto' => 'boolean',
        'resuelto_en' => 'datetime'
    ];

    /**
     * Relación con el usuario que generó el error
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación con el usuario que resolvió el error
     */
    public function resueltoBy()
    {
        return $this->belongsTo(User::class, 'resuelto_por');
    }

    /**
     * Scope para logs por tipo
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Scope para logs por nivel
     */
    public function scopePorNivel($query, $nivel)
    {
        return $query->where('nivel', $nivel);
    }

    /**
     * Scope para logs resueltos
     */
    public function scopeResueltos($query)
    {
        return $query->where('resuelto', true);
    }

    /**
     * Scope para logs pendientes
     */
    public function scopePendientes($query)
    {
        return $query->where('resuelto', false);
    }

    /**
     * Scope para logs críticos
     */
    public function scopeCriticos($query)
    {
        return $query->where('nivel', 'critical');
    }

    /**
     * Scope para logs de error
     */
    public function scopeErrores($query)
    {
        return $query->whereIn('nivel', ['error', 'critical']);
    }
}
