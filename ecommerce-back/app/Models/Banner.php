<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Banner extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'subtitulo',
        'descripcion',
        'texto_boton',
        'enlace_url', // ✅ CAMBIAR DE enlace_boton A enlace_url
        'precio_desde',
        'imagen_url',
        'orden',
        'activo',
        'tipo_banner', // ✅ NUEVO: principal u horizontal
        'posicion_horizontal' // ✅ NUEVO: posición del banner horizontal
    ];

    protected $casts = [
        'precio_desde' => 'decimal:2',
        'activo' => 'boolean',
        'orden' => 'integer',
        'tipo_banner' => 'string',
        'posicion_horizontal' => 'string'
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

    // ✅ NUEVO: Scope para obtener solo banners principales (carrusel)
    public function scopePrincipales($query)
    {
        return $query->where('tipo_banner', 'principal');
    }

    // ✅ NUEVO: Scope para obtener solo banners horizontales
    public function scopeHorizontales($query)
    {
        return $query->where('tipo_banner', 'horizontal');
    }

    // ✅ NUEVO: Scope para obtener solo banners sidebar
    public function scopeSidebar($query)
    {
        return $query->where('tipo_banner', 'sidebar');
    }

    // ✅ NUEVO: Scope para obtener banners por posición horizontal
    public function scopePorPosicion($query, $posicion)
    {
        return $query->where('posicion_horizontal', $posicion);
    }

    // Accessor para la URL completa de la imagen
    public function getImagenCompletaAttribute()
    {
        if ($this->imagen_url) {
            // Si la imagen ya tiene una URL completa, la devolvemos tal como está
            if (filter_var($this->imagen_url, FILTER_VALIDATE_URL)) {
                return $this->imagen_url;
            }
            // Si no, construimos la URL completa
            return asset('storage/' . $this->imagen_url);
        }
        
        // Imagen por defecto si no hay imagen
        return asset('assets/images/thumbs/banner-img-default.png');
    }

    // Método para eliminar la imagen anterior al actualizar
    public function eliminarImagenAnterior($nuevaImagen = null)
    {
        if ($this->imagen_url && $this->imagen_url !== $nuevaImagen) {
            // Solo eliminar si no es una URL externa
            if (!filter_var($this->imagen_url, FILTER_VALIDATE_URL)) {
                Storage::disk('public')->delete($this->imagen_url);
            }
        }
    }
}