<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PedidoDetalle extends Model
{
    use HasFactory;

    protected $table = 'pedido_detalles';

    protected $fillable = [
        'pedido_id',
        'producto_id',
        'codigo_producto',
        'nombre_producto',
        'cantidad',
        'precio_unitario',
        'subtotal_linea'
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'precio_unitario' => 'decimal:2',
        'subtotal_linea' => 'decimal:2'
    ];

    protected $appends = ['imagen_url'];

    public function pedido()
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    // Accessor para obtener la URL completa de la imagen
    public function getImagenUrlAttribute()
    {
        if ($this->producto && $this->producto->imagen) {
            return $this->producto->imagen_url;
        }
        return asset('images/no-image.png'); // Imagen por defecto
    }
}