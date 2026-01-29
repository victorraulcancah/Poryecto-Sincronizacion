<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaProducto extends Model
{
    use HasFactory;

    protected $table = 'recompensas_productos';

    protected $fillable = [
        'recompensa_id',
        'producto_id',
        'categoria_id'
    ];

    public $timestamps = false;

    // Relaciones

    /**
     * Recompensa a la que pertenece
     */
    public function recompensa(): BelongsTo
    {
        return $this->belongsTo(Recompensa::class);
    }

    /**
     * Producto específico (si aplica)
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Categoría específica (si aplica)
     */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    // Scopes

    /**
     * Scope para producto específico
     */
    public function scopePorProducto($query, $productoId)
    {
        return $query->where('producto_id', $productoId);
    }

    /**
     * Scope para categoría específica
     */
    public function scopePorCategoria($query, $categoriaId)
    {
        return $query->where('categoria_id', $categoriaId);
    }

    /**
     * Scope para recompensas que aplican a productos
     */
    public function scopeConProductos($query)
    {
        return $query->whereNotNull('producto_id');
    }

    /**
     * Scope para recompensas que aplican a categorías
     */
    public function scopeConCategorias($query)
    {
        return $query->whereNotNull('categoria_id');
    }

    // Accessors

    /**
     * Verifica si es para un producto específico
     */
    public function getEsProductoEspecificoAttribute(): bool
    {
        return !is_null($this->producto_id);
    }

    /**
     * Verifica si es para una categoría específica
     */
    public function getEsCategoriaEspecificaAttribute(): bool
    {
        return !is_null($this->categoria_id);
    }

    /**
     * Obtiene el nombre del elemento (producto o categoría)
     */
    public function getNombreElementoAttribute(): string
    {
        if ($this->es_producto_especifico && $this->producto) {
            return $this->producto->nombre;
        }

        if ($this->es_categoria_especifica && $this->categoria) {
            return $this->categoria->nombre;
        }

        return 'Sin especificar';
    }

    /**
     * Obtiene el tipo de elemento (producto o categoría)
     */
    public function getTipoElementoAttribute(): string
    {
        if ($this->es_producto_especifico) {
            return 'producto';
        }

        if ($this->es_categoria_especifica) {
            return 'categoria';
        }

        return 'desconocido';
    }

    // Métodos de utilidad

    /**
     * Verifica si un producto aplica para esta recompensa
     */
    public function productoAplica(Producto $producto): bool
    {
        // Si es producto específico, verificar que coincida
        if ($this->es_producto_especifico) {
            return $this->producto_id === $producto->id;
        }

        // Si es categoría específica, verificar que el producto pertenezca a esa categoría
        if ($this->es_categoria_especifica) {
            return $this->categoria_id === $producto->categoria_id;
        }

        return false;
    }

    /**
     * Obtiene todos los productos que aplican para esta configuración
     */
    public function getProductosAplicables()
    {
        if ($this->es_producto_especifico) {
            return Producto::where('id', $this->producto_id)->get();
        }

        if ($this->es_categoria_especifica) {
            return Producto::where('categoria_id', $this->categoria_id)->get();
        }

        return collect();
    }

    // Validaciones

    /**
     * Valida que solo se especifique producto O categoría, no ambos
     */
    public static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Validar que solo se especifique uno: producto_id O categoria_id
            if (!is_null($model->producto_id) && !is_null($model->categoria_id)) {
                throw new \InvalidArgumentException('No se puede especificar tanto producto_id como categoria_id al mismo tiempo.');
            }

            // Validar que al menos uno esté especificado
            if (is_null($model->producto_id) && is_null($model->categoria_id)) {
                throw new \InvalidArgumentException('Debe especificar al menos producto_id o categoria_id.');
            }
        });
    }
}