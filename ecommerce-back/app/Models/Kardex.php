<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kardex extends Model
{
    use HasFactory;

    protected $table = 'kardex';

    protected $fillable = [
        'producto_id',
        'fecha',
        'tipo_movimiento',
        'tipo_operacion',
        'documento_tipo',
        'documento_numero',
        'cantidad',
        'costo_unitario',
        'costo_total',
        'stock_anterior',
        'stock_actual',
        'costo_promedio',
        'compra_id',
        'venta_id',
        'user_id',
        'observaciones'
    ];

    protected $casts = [
        'fecha' => 'date',
        'cantidad' => 'integer',
        'costo_unitario' => 'decimal:2',
        'costo_total' => 'decimal:2',
        'stock_anterior' => 'integer',
        'stock_actual' => 'integer',
        'costo_promedio' => 'decimal:2'
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
