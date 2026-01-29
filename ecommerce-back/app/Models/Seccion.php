<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Seccion extends Model
{
    use HasFactory;

    protected $table = 'secciones';

    protected $fillable = [
        'nombre',
        'descripcion'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relación con categorías
    public function categorias()
    {
        return $this->hasMany(Categoria::class, 'id_seccion');
    }

    // Scope para obtener secciones con categorías activas
    public function scopeConCategorias($query)
    {
        return $query->with(['categorias' => function($q) {
            $q->where('activo', true);
        }]);
    }

    // Accessor para contar categorías
    public function getCategoriasCountAttribute()
    {
        return $this->categorias()->count();
    }

    // Método para verificar si se puede eliminar
    public function puedeEliminar()
    {
        return $this->categorias()->count() === 0;
    }
}
