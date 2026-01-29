<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EstadoCompra extends Model
{
    use HasFactory;

    protected $table = 'estados_compra';

    protected $fillable = [
        'nombre',
        'descripcion',
        'color',
        'orden'
    ];

    protected $casts = [
        'orden' => 'integer'
    ];

    // Relación con compras
    public function compras()
    {
        return $this->hasMany(Compra::class, 'estado_compra_id');
    }

    // Relación con tracking
    public function tracking()
    {
        return $this->hasMany(CompraTracking::class, 'estado_compra_id');
    }

    // Scope para ordenar por orden
    public function scopeOrdenado($query)
    {
        return $query->orderBy('orden');
    }

    // Obtener clase CSS para el badge
    public function getBadgeClassAttribute()
    {
        $clases = [
            'Pendiente Aprobación' => 'bg-warning-50 text-warning-600',
            'Aprobada' => 'bg-success-50 text-success-600',
            'Pagada' => 'bg-primary-50 text-primary-600',
            'En Preparación' => 'bg-info-50 text-info-600',
            'Enviada' => 'bg-purple-50 text-purple-600',
            'Entregada' => 'bg-success-50 text-success-600',
            'Cancelada' => 'bg-danger-50 text-danger-600',
            'Rechazada' => 'bg-danger-50 text-danger-600'
        ];

        return $clases[$this->nombre] ?? 'bg-secondary-50 text-secondary-600';
    }
}