<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VentaDetalle extends Model
{
    use HasFactory;

    protected $fillable = [
        'venta_id',
        'tipo_item',
        'producto_id',
        'servicio_id',
        'codigo_producto',
        'nombre_producto',
        'descripcion_producto',
        'cantidad',
        'precio_unitario',
        'precio_sin_igv',
        'descuento_unitario',
        'subtotal_linea',
        'igv_linea',
        'total_linea'
    ];

    protected $casts = [
        'cantidad' => 'decimal:4',
        'precio_unitario' => 'decimal:2',
        'precio_sin_igv' => 'decimal:2',
        'descuento_unitario' => 'decimal:2',
        'subtotal_linea' => 'decimal:2',
        'igv_linea' => 'decimal:2',
        'total_linea' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function servicio()
    {
        return $this->belongsTo(Servicio::class);
    }

    /**
     * Métodos de pago asignados a este item
     * (solo se usa en pagos mixtos con distribución por item)
     */
    public function metodosPago()
    {
        return $this->hasMany(VentaDetalleMetodoPago::class);
    }
}