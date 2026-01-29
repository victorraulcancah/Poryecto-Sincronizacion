<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CxcPago extends Model
{
    use HasFactory;

    protected $table = 'cxc_pagos';

    protected $fillable = [
        'cuenta_por_cobrar_id',
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

    public function cuentaPorCobrar()
    {
        return $this->belongsTo(CuentaPorCobrar::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
