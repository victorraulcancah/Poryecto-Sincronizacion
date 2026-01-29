<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductoMapeo7Power extends Model
{
    use HasFactory;

    protected $table = 'producto_mapeo_7power';

    protected $fillable = [
        'producto_id',
        'producto_7power_id',
    ];

    /**
     * Relación con el producto de Magus
     */
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
