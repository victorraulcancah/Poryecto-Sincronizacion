<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductoPrecio extends Model
{
    protected $table = 'producto_precios';

    protected $fillable = [
        'producto_id',
        'tipo_precio_id',
        'precio',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function tipoPrecio()
    {
        return $this->belongsTo(TipoPrecio::class, 'tipo_precio_id');
    }
}
