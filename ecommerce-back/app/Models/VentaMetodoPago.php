<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VentaMetodoPago extends Model
{
    protected $table = 'venta_metodos_pago';

    protected $fillable = [
        'venta_id',
        'metodo',
        'monto',
        'referencia'
    ];

    protected $casts = [
        'monto' => 'decimal:2',
    ];

    /**
     * Relación con Venta
     */
    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    /**
     * Asignaciones de este método de pago a productos individuales
     * (permite rastrear qué productos se pagaron con este método)
     */
    public function detallesAsignados()
    {
        return $this->hasMany(VentaDetalleMetodoPago::class);
    }
}
