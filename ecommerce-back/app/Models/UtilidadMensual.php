<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UtilidadMensual extends Model
{
    use HasFactory;

    protected $table = 'utilidad_mensual';

    protected $fillable = [
        'mes',
        'anio',
        'total_ventas',
        'total_costos',
        'utilidad_bruta',
        'margen_bruto_porcentaje',
        'gastos_operativos',
        'utilidad_operativa',
        'margen_operativo_porcentaje',
        'otros_ingresos',
        'otros_gastos',
        'utilidad_neta',
        'margen_neto_porcentaje'
    ];

    protected $casts = [
        'mes' => 'integer',
        'anio' => 'integer',
        'total_ventas' => 'decimal:2',
        'total_costos' => 'decimal:2',
        'utilidad_bruta' => 'decimal:2',
        'margen_bruto_porcentaje' => 'decimal:2',
        'gastos_operativos' => 'decimal:2',
        'utilidad_operativa' => 'decimal:2',
        'margen_operativo_porcentaje' => 'decimal:2',
        'otros_ingresos' => 'decimal:2',
        'otros_gastos' => 'decimal:2',
        'utilidad_neta' => 'decimal:2',
        'margen_neto_porcentaje' => 'decimal:2'
    ];
}
