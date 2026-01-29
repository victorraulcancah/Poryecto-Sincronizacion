<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VentaDetalleMetodoPago extends Model
{
    use HasFactory;

    protected $table = 'venta_detalle_metodos_pago';

    protected $fillable = [
        'venta_detalle_id',
        'venta_metodo_pago_id',
        'monto_asignado'
    ];

    protected $casts = [
        'monto_asignado' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Relación con VentaDetalle (producto)
     */
    public function ventaDetalle()
    {
        return $this->belongsTo(VentaDetalle::class);
    }

    /**
     * Relación con VentaMetodoPago (método de pago usado)
     */
    public function ventaMetodoPago()
    {
        return $this->belongsTo(VentaMetodoPago::class);
    }
}
