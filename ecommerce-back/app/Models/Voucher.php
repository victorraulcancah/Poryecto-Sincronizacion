<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo',
        'numero_operacion',
        'fecha',
        'monto',
        'banco',
        'cuenta_origen',
        'cuenta_destino',
        'metodo_pago',
        'archivo_voucher',
        'cuenta_por_cobrar_id',
        'cuenta_por_pagar_id',
        'venta_id',
        'compra_id',
        'estado',
        'observaciones',
        'user_id',
        'verificado_por',
        'verificado_at'
    ];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
        'verificado_at' => 'datetime'
    ];

    protected $appends = ['archivo_url'];

    public function getArchivoUrlAttribute()
    {
        if ($this->archivo_voucher) {
            return asset('storage/' . $this->archivo_voucher);
        }
        return null;
    }

    public function cuentaPorCobrar()
    {
        return $this->belongsTo(CuentaPorCobrar::class);
    }

    public function cuentaPorPagar()
    {
        return $this->belongsTo(CuentaPorPagar::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function verificador()
    {
        return $this->belongsTo(User::class, 'verificado_por');
    }
}
