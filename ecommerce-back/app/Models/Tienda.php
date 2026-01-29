<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tienda extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'descripcion',
        'logo',
        'estado'
    ];

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'tienda_id');
    }

    public function cajas()
    {
        return $this->hasMany(Caja::class, 'tienda_id');
    }
}
