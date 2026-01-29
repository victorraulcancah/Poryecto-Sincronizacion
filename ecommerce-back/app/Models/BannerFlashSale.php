<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BannerFlashSale extends Model
{
    use HasFactory;

    protected $table = 'banners_flash_sales';

    protected $fillable = [
        'nombre',
        'color_badge',
        'fecha_inicio',
        'fecha_fin',
        'imagen',
        'color_boton',
        'texto_boton',
        'enlace_url',
        'activo'
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'activo' => 'boolean'
    ];

    protected $appends = ['imagen_url'];

    // Accessors
    public function getImagenUrlAttribute()
    {
        if (!$this->imagen) {
            return null;
        }

        if (str_starts_with($this->imagen, 'http')) {
            return $this->imagen;
        }

        return asset('storage/' . $this->imagen);
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true)
            ->where('fecha_inicio', '<=', now())
            ->where('fecha_fin', '>=', now());
    }

    public function scopeOrdenadosPorId($query)
    {
        return $query->orderBy('id', 'asc');
    }

    // Métodos de utilidad
    public function estaVigente()
    {
        return $this->activo &&
            $this->fecha_inicio <= now() &&
            $this->fecha_fin >= now();
    }

    public function tiempoRestante()
    {
        if (!$this->estaVigente()) {
            return null;
        }

        return now()->diffInSeconds($this->fecha_fin, false);
    }
}
