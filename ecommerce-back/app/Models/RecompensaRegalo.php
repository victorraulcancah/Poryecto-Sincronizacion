<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaRegalo extends Model
{
    use HasFactory;

    protected $table = 'recompensas_regalos';

    protected $fillable = [
        'recompensa_id',
        'producto_id',
        'cantidad'
    ];

    protected $casts = [
        'cantidad' => 'integer'
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
     * Producto que se regala
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    // Scopes

    /**
     * Scope para regalos de un producto específico
     */
    public function scopePorProducto($query, $productoId)
    {
        return $query->where('producto_id', $productoId);
    }

    /**
     * Scope para regalos con cantidad específica
     */
    public function scopeConCantidad($query, $cantidad)
    {
        return $query->where('cantidad', $cantidad);
    }

    /**
     * Scope para regalos múltiples (cantidad > 1)
     */
    public function scopeRegalosMultiples($query)
    {
        return $query->where('cantidad', '>', 1);
    }

    // Accessors

    /**
     * Verifica si es un regalo múltiple
     */
    public function getEsRegaloMultipleAttribute(): bool
    {
        return $this->cantidad > 1;
    }

    /**
     * Obtiene el nombre del producto regalo
     */
    public function getNombreProductoAttribute(): string
    {
        return $this->producto ? $this->producto->nombre : 'Producto no encontrado';
    }

    /**
     * Obtiene el código del producto regalo
     */
    public function getCodigoProductoAttribute(): string
    {
        return $this->producto ? $this->producto->codigo_producto : 'N/A';
    }

    /**
     * Obtiene el precio del producto regalo
     */
    public function getPrecioProductoAttribute(): float
    {
        return $this->producto ? $this->producto->precio_venta : 0;
    }

    /**
     * Obtiene el valor total del regalo
     */
    public function getValorTotalRegaloAttribute(): float
    {
        return $this->precio_producto * $this->cantidad;
    }

    /**
     * Obtiene la descripción del regalo
     */
    public function getDescripcionRegaloAttribute(): string
    {
        $descripcion = $this->nombre_producto;
        
        if ($this->es_regalo_multiple) {
            $descripcion .= " (x{$this->cantidad})";
        }
        
        $descripcion .= " - Valor: S/ " . number_format($this->valor_total_regalo, 2);
        
        return $descripcion;
    }

    /**
     * Verifica si el producto tiene stock suficiente
     */
    public function getTieneStockSuficienteAttribute(): bool
    {
        if (!$this->producto) {
            return false;
        }
        
        return $this->producto->stock >= $this->cantidad;
    }

    /**
     * Obtiene el stock disponible del producto
     */
    public function getStockDisponibleAttribute(): int
    {
        return $this->producto ? $this->producto->stock : 0;
    }

    // Métodos de validación

    /**
     * Verifica si el regalo puede ser otorgado
     */
    public function puedeSerOtorgado(): bool
    {
        // Verificar que el producto existe
        if (!$this->producto) {
            return false;
        }

        // Verificar que el producto está activo
        if (!$this->producto->activo) {
            return false;
        }

        // Verificar stock suficiente
        if (!$this->tiene_stock_suficiente) {
            return false;
        }

        // Verificar cantidad válida
        if ($this->cantidad <= 0) {
            return false;
        }

        return true;
    }

    /**
     * Verifica disponibilidad para múltiples regalos
     */
    public function verificarDisponibilidadMultiple(int $cantidadRegalos): array
    {
        $stockRequerido = $this->cantidad * $cantidadRegalos;
        $stockDisponible = $this->stock_disponible;
        
        return [
            'puede_otorgar' => $stockDisponible >= $stockRequerido,
            'stock_requerido' => $stockRequerido,
            'stock_disponible' => $stockDisponible,
            'cantidad_maxima_regalos' => $this->cantidad > 0 ? intval($stockDisponible / $this->cantidad) : 0
        ];
    }

    // Métodos de utilidad

    /**
     * Reduce el stock del producto regalo
     */
    public function reducirStock(): bool
    {
        if (!$this->puedeSerOtorgado()) {
            return false;
        }

        $this->producto->stock -= $this->cantidad;
        return $this->producto->save();
    }

    /**
     * Restaura el stock del producto regalo (en caso de cancelación)
     */
    public function restaurarStock(): bool
    {
        if (!$this->producto) {
            return false;
        }

        $this->producto->stock += $this->cantidad;
        return $this->producto->save();
    }

    /**
     * Obtiene información completa del regalo
     */
    public function getInformacionCompleta(): array
    {
        return [
            'producto' => [
                'id' => $this->producto_id,
                'nombre' => $this->nombre_producto,
                'codigo' => $this->codigo_producto,
                'precio_unitario' => $this->precio_producto,
                'activo' => $this->producto ? $this->producto->activo : false
            ],
            'regalo' => [
                'cantidad' => $this->cantidad,
                'valor_total' => $this->valor_total_regalo,
                'descripcion' => $this->descripcion_regalo,
                'es_multiple' => $this->es_regalo_multiple
            ],
            'disponibilidad' => [
                'stock_disponible' => $this->stock_disponible,
                'tiene_stock_suficiente' => $this->tiene_stock_suficiente,
                'puede_ser_otorgado' => $this->puedeSerOtorgado()
            ]
        ];
    }

    /**
     * Verifica si la configuración es válida
     */
    public function esConfiguracionValida(): bool
    {
        // Debe tener un producto válido
        if (!$this->producto_id || !$this->producto) {
            return false;
        }

        // Cantidad debe ser positiva
        if ($this->cantidad <= 0) {
            return false;
        }

        return true;
    }

    /**
     * Obtiene un resumen de la configuración
     */
    public function getResumenConfiguracion(): array
    {
        return [
            'descripcion' => $this->descripcion_regalo,
            'producto' => [
                'nombre' => $this->nombre_producto,
                'codigo' => $this->codigo_producto,
                'precio' => $this->precio_producto
            ],
            'cantidad' => $this->cantidad,
            'valor_total' => $this->valor_total_regalo,
            'disponibilidad' => [
                'stock' => $this->stock_disponible,
                'disponible' => $this->puedeSerOtorgado()
            ],
            'es_valida' => $this->esConfiguracionValida()
        ];
    }

    // Eventos del modelo
    public static function boot()
    {
        parent::boot();

        // Validar antes de guardar
        static::saving(function ($model) {
            if ($model->cantidad <= 0) {
                throw new \InvalidArgumentException('La cantidad debe ser mayor a 0.');
            }
        });
    }
}