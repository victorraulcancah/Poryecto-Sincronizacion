<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CajaTransaccion extends Model
{
    use HasFactory;

    protected $table = 'caja_transacciones';

    protected $fillable = [
        'caja_movimiento_id',
        'tipo',
        'categoria',
        'monto',
        'metodo_pago',
        'referencia',
        'venta_id',
        'comprobante_id',
        'descripcion',
        'user_id'
    ];

    protected $casts = [
        'monto' => 'decimal:2'
    ];

    public function cajaMovimiento()
    {
        return $this->belongsTo(CajaMovimiento::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
