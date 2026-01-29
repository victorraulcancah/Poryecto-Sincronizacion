<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UtilidadVenta extends Model
{
    use HasFactory;

    protected $table = 'utilidad_ventas';

    protected $fillable = [
        'venta_id',
        'comprobante_id',
        'fecha_venta',
        'total_venta',
        'costo_total',
        'utilidad_bruta',
        'margen_porcentaje',
        'gastos_operativos',
        'utilidad_neta',
        'observaciones'
    ];

    protected $casts = [
        'fecha_venta' => 'date',
        'total_venta' => 'decimal:2',
        'costo_total' => 'decimal:2',
        'utilidad_bruta' => 'decimal:2',
        'margen_porcentaje' => 'decimal:2',
        'gastos_operativos' => 'decimal:2',
        'utilidad_neta' => 'decimal:2'
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }
}
