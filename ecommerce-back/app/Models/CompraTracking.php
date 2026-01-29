<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompraTracking extends Model
{
    use HasFactory;

    protected $table = 'compra_tracking';

    protected $fillable = [
        'compra_id',
        'estado_compra_id',
        'comentario',
        'usuario_id',
        'fecha_cambio'
    ];

    protected $casts = [
        'fecha_cambio' => 'datetime'
    ];

    // Relación con compra
    public function compra()
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }

    // Relación con estado de compra
    public function estadoCompra()
    {
        return $this->belongsTo(EstadoCompra::class, 'estado_compra_id');
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
    public static function crearRegistro($compraId, $estadoId, $comentario = null, $usuarioId = null)
    {
        return static::create([
            'compra_id' => $compraId,
            'estado_compra_id' => $estadoId,
            'comentario' => $comentario,
            'usuario_id' => $usuarioId === null ? null : ($usuarioId ?: auth()->id()),
            'fecha_cambio' => now()
        ]);
    }
}