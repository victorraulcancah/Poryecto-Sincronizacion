<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Caja extends Model
{
    use HasFactory;

    protected $table = 'cajas';

    protected $fillable = [
        'nombre',
        'codigo',
        'tienda_id',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function tienda()
    {
        return $this->belongsTo(Tienda::class);
    }

    public function movimientos()
    {
        return $this->hasMany(CajaMovimiento::class);
    }

    public function movimientoActual()
    {
        return $this->hasOne(CajaMovimiento::class)->where('estado', 'ABIERTA')->latest();
    }
}
