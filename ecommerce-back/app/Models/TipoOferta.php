<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoOferta extends Model
{
    use HasFactory;

    protected $table = 'tipos_ofertas';

    protected $fillable = [
        'nombre',
        'descripcion',
        'icono',
        'activo'
    ];

    protected $casts = [
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function ofertas()
    {
        return $this->hasMany(Oferta::class);
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }
}