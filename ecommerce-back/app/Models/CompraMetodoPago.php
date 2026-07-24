<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompraMetodoPago extends Model
{
    protected $table = 'compra_metodos_pago';

    protected $fillable = [
        'compra_id',
        'tipo',
        'moneda',
        'monto',
    ];

    protected $casts = [
        'monto' => 'float',
    ];

    public function compra()
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }
}
