<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarcaProducto extends Model
{
    protected $table = 'marcas_productos';
    protected $fillable = [
        'nombre',
        'descripcion',
        'imagen',
        'activo',
        // Vitrina de la pagina publica de marcas: si sale y en que posicion.
        // Es independiente de `activo`: una marca puede venderse y no salir ahi.
        'mostrar_en_vitrina',
        'orden_vitrina',
    ];
    protected $casts = [
        'activo' => 'boolean',
        'mostrar_en_vitrina' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relación con productos
    public function productos()
    {
        return $this->hasMany(\App\Models\Producto::class, 'marca_id');
    }

    public function getImagenUrlAttribute()
    {
        if ($this->imagen) {
            return asset('storage/marcas_productos/' . $this->imagen);
        }
        return null;
    }

    public function scopeActivas($query)
    {
        return $query->where('activo', true);
    }

    public function scopeInactivas($query)
    {
        return $query->where('activo', false);
    }

    // Accessor para contar productos
    public function getProductosCountAttribute()
    {
        return $this->productos()->count();
    }

    // Accessor para contar productos activos
    public function getProductosActivosCountAttribute()
    {
        return $this->productos()->where('activo', true)->count();
    }

    // Método para verificar si se puede eliminar
    public function puedeEliminar()
    {
        return $this->productos()->count() === 0;
    }

    // Boot method para eventos del modelo
    protected static function boot()
    {
        parent::boot();

        // Evento antes de eliminar
        static::deleting(function ($marca) {
            // Eliminar imagen si existe
            if ($marca->imagen) {
                $rutaImagen = public_path('storage/marcas_productos/' . $marca->imagen);
                if (file_exists($rutaImagen)) {
                    unlink($rutaImagen);
                }
            }
        });
    }
}