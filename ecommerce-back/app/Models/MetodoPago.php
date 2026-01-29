<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MetodoPago extends Model
{
    use HasFactory;

    protected $table = 'metodos_pago';

    protected $fillable = [
        'nombre',
        'descripcion',
        'activo'
    ];

    protected $casts = [
        'activo' => 'boolean'
    ];

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'metodo_pago_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }
}
