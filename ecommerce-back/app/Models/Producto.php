<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Producto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nombre',
        'descripcion',
        'codigo_producto',
        'categoria_id',
        'marca_id',
        'precio_compra',
        'precio_venta',
        'stock',
        'stock_minimo',
        'imagen',
        'manual_pdf',
        'activo',
        'destacado',
        'mostrar_igv'
    ];

    protected $casts = [
        'precio_compra' => 'decimal:2',
        'precio_venta' => 'decimal:2',
        'stock' => 'integer',
        'stock_minimo' => 'integer',
        'activo' => 'boolean',
        'destacado' => 'boolean',
        'mostrar_igv' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    protected $dates = ['deleted_at'];

    protected $appends = ['imagen_url', 'manual_pdf_url'];

    // Relación con categoría
    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    // Precios por tipo de precio (lista)
    public function precios()
    {
        return $this->hasMany(ProductoPrecio::class, 'producto_id');
    }

    public function tiposPrecio()
    {
        return $this->belongsToMany(TipoPrecio::class, 'producto_precios', 'producto_id', 'tipo_precio_id')
            ->withPivot('precio')
            ->withTimestamps();
    }

    /**
     * Precio del producto para un tipo de precio dado.
     * Devuelve null si el producto no tiene precio en esa lista.
     */
    public function precioPara(?int $tipoPrecioId): ?float
    {
        if (!$tipoPrecioId) {
            return null;
        }
        $pp = $this->precios->firstWhere('tipo_precio_id', $tipoPrecioId);
        return $pp ? (float) $pp->precio : null;
    }

    // Relación con marca
    public function marca()
    {
        return $this->belongsTo(MarcaProducto::class, 'marca_id');
    }

    // Scope para productos activos (y no eliminados)
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    // Scope para productos disponibles (activos y no eliminados)
    public function scopeDisponibles($query)
    {
        return $query->where('activo', true);
    }

    // Scope para productos con stock bajo
    public function scopeStockBajo($query)
    {
        return $query->whereRaw('stock <= stock_minimo');
    }

    // Scope para buscar productos
    public function scopeBuscar($query, $termino)
    {
        return $query->where(function ($q) use ($termino) {
            $q->where('nombre', 'like', "%{$termino}%")
                ->orWhere('codigo_producto', 'like', "%{$termino}%")
                ->orWhere('descripcion', 'like', "%{$termino}%");
        });
    }

    // Accessor para la URL completa de la imagen
    public function getImagenUrlAttribute()
    {
        if ($this->imagen) {
            return asset('storage/productos/' . $this->imagen);
        }
        return null;
    }

    // Accessor para la URL completa del manual en PDF
    public function getManualPdfUrlAttribute()
    {
        if ($this->manual_pdf) {
            return asset('storage/productos/manuales/' . $this->manual_pdf);
        }
        return null;
    }

    // Accessor para verificar si el stock está bajo
    public function getStockBajoAttribute()
    {
        return $this->stock <= $this->stock_minimo;
    }

    // Accessor para calcular el margen de ganancia
    public function getMargenGananciaAttribute()
    {
        if ($this->precio_compra > 0) {
            return (($this->precio_venta - $this->precio_compra) / $this->precio_compra) * 100;
        }
        return 0;
    }

    // Accessor para el estado del stock
    public function getEstadoStockAttribute()
    {
        if ($this->stock == 0) {
            return 'Sin stock';
        } elseif ($this->stock <= $this->stock_minimo) {
            return 'Stock bajo';
        } else {
            return 'Stock normal';
        }
    }

    // Boot method para eventos del modelo
    protected static function boot()
    {
        parent::boot();

        // Evento antes de eliminar
        static::deleting(function ($producto) {
            // Eliminar imagen si existe
            if ($producto->imagen) {
                $rutaImagen = public_path('storage/productos/' . $producto->imagen);
                if (file_exists($rutaImagen)) {
                    unlink($rutaImagen);
                }
            }
            // Eliminar manual PDF si existe
            if ($producto->manual_pdf) {
                $rutaManual = public_path('storage/productos/manuales/' . $producto->manual_pdf);
                if (file_exists($rutaManual)) {
                    unlink($rutaManual);
                }
            }
        });
    }
    public function detalles()
    {
        return $this->hasOne(ProductoDetalle::class);
    }
    // Relación con kardex
    public function kardex()
    {
        return $this->hasMany(Kardex::class, 'producto_id');
    }
}
