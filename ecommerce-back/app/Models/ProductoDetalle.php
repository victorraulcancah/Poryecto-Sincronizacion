<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductoDetalle extends Model
{
    use HasFactory;

    protected $table = 'producto_detalles';

    protected $fillable = [
        'producto_id',
        'descripcion_detallada',
        'especificaciones',
        'caracteristicas_tecnicas',
        'instrucciones_uso',
        'garantia',
        'politicas_devolucion',
        'dimensiones',
        'imagenes',
        'videos'
    ];

    protected $casts = [
        'especificaciones' => 'array',
        'caracteristicas_tecnicas' => 'array',
        'dimensiones' => 'array',
        'imagenes' => 'array',
        'videos' => 'array'
    ];

    // Relación con producto
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Accessor para obtener URLs de imágenes
    public function getImagenesUrlAttribute()
    {
        if (!$this->imagenes) {
            return [];
        }

        $imagenes = is_string($this->imagenes) ? json_decode($this->imagenes, true) : $this->imagenes;
        $urls = [];

        foreach ($imagenes as $imagen) {
            if (\Storage::disk('public')->exists('productos/detalles/' . $imagen)) {
                $urls[] = asset('storage/productos/detalles/' . $imagen);
            }
        }

        return $urls;
    }

    // Accessor para especificaciones formateadas
    public function getEspecificacionesFormateadasAttribute()
    {
        if (!$this->especificaciones) {
            return [];
        }

        $specs = is_string($this->especificaciones) ? json_decode($this->especificaciones, true) : $this->especificaciones;
        return is_array($specs) ? $specs : [];
    }

    // Accessor para características técnicas formateadas
    public function getCaracteristicasTecnicasFormateadasAttribute()
    {
        if (!$this->caracteristicas_tecnicas) {
            return [];
        }

        $caracteristicas = is_string($this->caracteristicas_tecnicas) ? json_decode($this->caracteristicas_tecnicas, true) : $this->caracteristicas_tecnicas;
        return is_array($caracteristicas) ? $caracteristicas : [];
    }

    // Accessor para dimensiones formateadas
    public function getDimensionesFormateadasAttribute()
    {
        if (!$this->dimensiones) {
            return null;
        }

        $dims = is_string($this->dimensiones) ? json_decode($this->dimensiones, true) : $this->dimensiones;
        return is_array($dims) ? $dims : null;
    }

    // Accessor para videos formateados
    public function getVideosFormateadosAttribute()
    {
        if (!$this->videos) {
            return [];
        }

        $videos = is_string($this->videos) ? json_decode($this->videos, true) : $this->videos;
        return is_array($videos) ? array_filter($videos) : [];
    }
}