<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BannerOferta extends Model
{
    protected $table = 'banners_ofertas';

    protected $fillable = [
        'imagen',
        'activo',
        'prioridad'
    ];

    protected $casts = [
        'activo' => 'boolean'
    ];

    protected $appends = ['imagen_url'];

    /**
     * Relación muchos a muchos con Producto
     */
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'banner_oferta_producto')
            ->withPivot('descuento_porcentaje')
            ->withTimestamps();
    }

    /**
     * Accessor para la URL completa de la imagen
     */
    public function getImagenUrlAttribute()
    {
        if ($this->imagen) {
            return url('storage/' . $this->imagen);
        }
        return null;
    }

    /**
     * Scope para obtener solo banners activos
     */
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    /**
     * Scope para ordenar por prioridad
     */
    public function scopeOrdenadosPorPrioridad($query)
    {
        return $query->orderBy('prioridad', 'desc')->orderBy('id', 'desc');
    }
}
