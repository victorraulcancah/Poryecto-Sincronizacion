<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OfertaProducto extends Model
{
    use HasFactory;

    protected $table = 'ofertas_productos';

    protected $fillable = [
        'oferta_id',
        'producto_id',
        'precio_oferta',
        'stock_oferta',
        'vendidos_oferta'
    ];

    protected $casts = [
        'precio_oferta' => 'decimal:2',
        'stock_oferta' => 'integer',
        'vendidos_oferta' => 'integer'
    ];

    // Relaciones
    public function oferta()
    {
        return $this->belongsTo(Oferta::class);
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Métodos de utilidad
    public function getPorcentajeVendidoAttribute()
    {
        if (!$this->stock_oferta || $this->stock_oferta == 0) {
            return 0;
        }
        return ($this->vendidos_oferta / $this->stock_oferta) * 100;
    }

    public function getStockDisponibleAttribute()
    {
        return max(0, ($this->stock_oferta ?? 0) - $this->vendidos_oferta);
    }
}