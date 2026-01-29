<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EstadoCotizacion extends Model
{
    use HasFactory;

    protected $table = 'estados_cotizacion';

    protected $fillable = [
        'nombre',
        'descripcion',
        'color',
        'orden',
        'permite_conversion'
    ];

    protected $casts = [
        'permite_conversion' => 'boolean',
        'orden' => 'integer'
    ];

    // Relación con cotizaciones
    public function cotizaciones()
    {
        return $this->hasMany(Cotizacion::class, 'estado_cotizacion_id');
    }

    // Relación con tracking
    public function tracking()
    {
        return $this->hasMany(CotizacionTracking::class, 'estado_cotizacion_id');
    }

    // Scope para ordenar por orden
    public function scopeOrdenado($query)
    {
        return $query->orderBy('orden');
    }

    // Scope para estados que permiten conversión
    public function scopePermiteConversion($query)
    {
        return $query->where('permite_conversion', true);
    }

    // Obtener clase CSS para el badge
    public function getBadgeClassAttribute()
    {
        $clases = [
            'Pendiente' => 'bg-warning-50 text-warning-600',
            'En Revisión' => 'bg-info-50 text-info-600',
            'Aprobada' => 'bg-success-50 text-success-600',
            'Rechazada' => 'bg-danger-50 text-danger-600',
            'Enviada para Compra' => 'bg-purple-50 text-purple-600',
            'Convertida a Compra' => 'bg-primary-50 text-primary-600',
            'Vencida' => 'bg-secondary-50 text-secondary-600',
            'Cancelada' => 'bg-danger-50 text-danger-600'
        ];

        return $clases[$this->nombre] ?? 'bg-secondary-50 text-secondary-600';
    }
}