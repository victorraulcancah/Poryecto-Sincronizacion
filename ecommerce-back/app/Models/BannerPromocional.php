<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class BannerPromocional extends Model
{
    use HasFactory;

    protected $table = 'banners_promocionales';

    protected $fillable = [
        'titulo',
        'precio',
        'texto_boton',
        'imagen_url',
        'enlace_url',
        'orden',
        'animacion_delay',
        'color_boton',
        'color_texto',
        'color_badge_nombre',
        'color_badge_precio',
        'activo'
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'activo' => 'boolean',
        'orden' => 'integer',
        'animacion_delay' => 'integer'
    ];

    // Scope para obtener solo banners activos
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    // Scope para ordenar por orden
    public function scopeOrdenados($query)
    {
        return $query->orderBy('orden', 'asc');
    }

    // Accessor para la URL completa de la imagen
    public function getImagenCompletaAttribute()
    {
        if ($this->imagen_url) {
            if (filter_var($this->imagen_url, FILTER_VALIDATE_URL)) {
                return $this->imagen_url;
            }
            return asset('storage/' . $this->imagen_url);
        }
        
        return asset('assets/images/thumbs/promotional-banner-default.png');
    }

    // Método para eliminar la imagen anterior
    public function eliminarImagenAnterior($nuevaImagen = null)
    {
        if ($this->imagen_url && $this->imagen_url !== $nuevaImagen) {
            if (!filter_var($this->imagen_url, FILTER_VALIDATE_URL)) {
                Storage::disk('public')->delete($this->imagen_url);
            }
        }
    }
}
