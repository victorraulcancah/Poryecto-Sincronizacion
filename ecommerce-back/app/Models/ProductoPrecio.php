<?php

namespace App\Models;

use App\Support\PreciosEnVivo;
use Illuminate\Database\Eloquent\Collection;
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

    /**
     * Cada vez que la tienda carga precios (listados, detalle, carrito, pago...) se corrigen con los que
     * tiene Novik en ese momento: ver `PreciosEnVivo`.
     */
    public function newCollection(array $models = []): Collection
    {
        $coleccion = parent::newCollection($models);
        PreciosEnVivo::aplicar($coleccion);

        return $coleccion;
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function tipoPrecio()
    {
        return $this->belongsTo(TipoPrecio::class, 'tipo_precio_id');
    }
}
