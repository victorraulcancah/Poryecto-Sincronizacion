<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pago extends Model
{
    use HasFactory;

    protected $fillable = [
        'comprobante_id',
        'metodo_pago',
        'monto',
        'fecha_pago',
        'referencia_pago',
        'observaciones',
        'estado',
        'user_id',
        'metadata'
    ];

    protected $casts = [
        'fecha_pago' => 'date',
        'monto' => 'decimal:2',
        'metadata' => 'array'
    ];

    /**
     * Relación con el comprobante
     */
    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    /**
     * Relación con el usuario que registró el pago
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para pagos completados
     */
    public function scopeCompletados($query)
    {
        return $query->where('estado', 'completado');
    }

    /**
     * Scope para pagos pendientes
     */
    public function scopePendientes($query)
    {
        return $query->where('estado', 'pendiente');
    }

    /**
     * Scope para pagos por método
     */
    public function scopePorMetodo($query, $metodo)
    {
        return $query->where('metodo_pago', $metodo);
    }
}
