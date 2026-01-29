<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompraDetalle extends Model
{
    use HasFactory;

    protected $table = 'compra_detalles';

    protected $fillable = [
        'compra_id',
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

    // Relación con compra
    public function compra()
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }

    // Relación con producto
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    // Accessor para obtener la URL de la imagen del producto
    public function getImagenUrlAttribute()
    {
        if ($this->producto && $this->producto->imagen) {
            $baseUrl = config('app.url', 'http://localhost:8000');
            return $baseUrl . '/storage/productos/' . $this->producto->imagen;
        }

        return null;
    }

    // Verificar si el producto tiene stock suficiente
    public function tieneStockSuficiente(): bool
    {
        if (!$this->producto) {
            return false;
        }

        return $this->producto->stock >= $this->cantidad;
    }

    // Calcular el subtotal automáticamente
    public function calcularSubtotal(): float
    {
        return $this->cantidad * $this->precio_unitario;
    }

    // Actualizar subtotal antes de guardar
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($detalle) {
            $detalle->subtotal_linea = $detalle->calcularSubtotal();
        });
    }
}