<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CuentaPorCobrar extends Model
{
    use HasFactory;

    protected $table = 'cuentas_por_cobrar';

    protected $fillable = [
        'cliente_id',
        'venta_id',
        'comprobante_id',
        'numero_documento',
        'fecha_emision',
        'fecha_vencimiento',
        'monto_total',
        'monto_pagado',
        'saldo_pendiente',
        'estado',
        'dias_credito',
        'dias_vencidos',
        'observaciones',
        'user_id'
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_vencimiento' => 'date',
        'monto_total' => 'decimal:2',
        'monto_pagado' => 'decimal:2',
        'saldo_pendiente' => 'decimal:2',
        'dias_credito' => 'integer',
        'dias_vencidos' => 'integer'
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    public function pagos()
    {
        return $this->hasMany(CxcPago::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
