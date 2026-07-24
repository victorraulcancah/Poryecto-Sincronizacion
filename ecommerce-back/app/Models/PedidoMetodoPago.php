<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PedidoMetodoPago extends Model
{
    protected $table = 'pedido_metodos_pago';

    protected $fillable = [
        'pedido_id',
        'tipo',
        'moneda',
        'monto',
    ];

    protected $casts = [
        'monto' => 'float',
    ];

    public function pedido()
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }
}
