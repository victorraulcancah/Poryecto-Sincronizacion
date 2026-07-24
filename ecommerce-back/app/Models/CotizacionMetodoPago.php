<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CotizacionMetodoPago extends Model
{
    protected $table = 'cotizacion_metodos_pago';

    protected $fillable = [
        'cotizacion_id',
        'tipo',
        'moneda',
        'monto',
    ];

    protected $casts = [
        'monto' => 'float',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(Cotizacion::class, 'cotizacion_id');
    }
}
