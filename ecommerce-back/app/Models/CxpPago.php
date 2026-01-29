<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CxpPago extends Model
{
    use HasFactory;

    protected $table = 'cxp_pagos';

    protected $fillable = [
        'cuenta_por_pagar_id',
        'fecha_pago',
        'monto',
        'metodo_pago',
        'referencia',
        'numero_operacion',
        'observaciones',
        'user_id'
    ];

    protected $casts = [
        'fecha_pago' => 'date',
        'monto' => 'decimal:2'
    ];

    public function cuentaPorPagar()
    {
        return $this->belongsTo(CuentaPorPagar::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
