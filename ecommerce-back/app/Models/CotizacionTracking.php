<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CotizacionTracking extends Model
{
    use HasFactory;

    protected $table = 'cotizacion_tracking';

    protected $fillable = [
        'cotizacion_id',
        'estado_cotizacion_id',
        'comentario',
        'usuario_id',
        'fecha_cambio'
    ];

    protected $casts = [
        'fecha_cambio' => 'datetime'
    ];

    // Relación con cotización
    public function cotizacion()
    {
        return $this->belongsTo(Cotizacion::class, 'cotizacion_id');
    }

    // Relación con estado de cotización
    public function estadoCotizacion()
    {
        return $this->belongsTo(EstadoCotizacion::class, 'estado_cotizacion_id');
    }

    // Relación con usuario que realizó el cambio
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    // Scope para ordenar por fecha
    public function scopeOrdenadoPorFecha($query, $direccion = 'asc')
    {
        return $query->orderBy('fecha_cambio', $direccion);
    }

    // Crear registro de tracking automático
    public static function crearRegistro($cotizacionId, $estadoId, $comentario = null, $usuarioId = null)
    {
        return static::create([
            'cotizacion_id' => $cotizacionId,
            'estado_cotizacion_id' => $estadoId,
            'comentario' => $comentario,
            'usuario_id' => $usuarioId, // Acepta null sin usar auth()->id() como fallback
            'fecha_cambio' => now()
        ]);
    }
}