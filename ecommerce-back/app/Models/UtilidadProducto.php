<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UtilidadProducto extends Model
{
    use HasFactory;

    protected $table = 'utilidad_productos';

    protected $fillable = [
        'producto_id',
        'fecha',
        'cantidad_vendida',
        'precio_venta_promedio',
        'costo_promedio',
        'total_ventas',
        'total_costos',
        'utilidad_bruta',
        'margen_porcentaje'
    ];

    protected $casts = [
        'fecha' => 'date',
        'cantidad_vendida' => 'integer',
        'precio_venta_promedio' => 'decimal:2',
        'costo_promedio' => 'decimal:2',
        'total_ventas' => 'decimal:2',
        'total_costos' => 'decimal:2',
        'utilidad_bruta' => 'decimal:2',
        'margen_porcentaje' => 'decimal:2'
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }
}
