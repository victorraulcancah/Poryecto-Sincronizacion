<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaDescuento extends Model
{
    use HasFactory;

    protected $table = 'recompensas_descuentos';

    protected $fillable = [
        'recompensa_id',
        'tipo_descuento',
        'valor_descuento',
        'compra_minima'
    ];

    protected $casts = [
        'valor_descuento' => 'decimal:2',
        'compra_minima' => 'decimal:2'
    ];

    public $timestamps = false;

    // Tipos de descuento disponibles
    const TIPO_PORCENTAJE = 'porcentaje';
    const TIPO_CANTIDAD_FIJA = 'cantidad_fija';

    public static function getTiposDescuento()
    {
        return [
            self::TIPO_PORCENTAJE,
            self::TIPO_CANTIDAD_FIJA
        ];
    }

    // Relaciones

    /**
     * Recompensa a la que pertenece
     */
    public function recompensa(): BelongsTo
    {
        return $this->belongsTo(Recompensa::class);
    }

    // Scopes

    /**
     * Scope para descuentos por porcentaje
     */
    public function scopePorcentaje($query)
    {
        return $query->where('tipo_descuento', self::TIPO_PORCENTAJE);
    }

    /**
     * Scope para descuentos por cantidad fija
     */
    public function scopeCantidadFija($query)
    {
        return $query->where('tipo_descuento', self::TIPO_CANTIDAD_FIJA);
    }

    /**
     * Scope para descuentos con compra mínima
     */
    public function scopeConCompraMinima($query)
    {
        return $query->whereNotNull('compra_minima')->where('compra_minima', '>', 0);
    }

    // Accessors

    /**
     * Verifica si es descuento por porcentaje
     */
    public function getEsPorcentajeAttribute(): bool
    {
        return $this->tipo_descuento === self::TIPO_PORCENTAJE;
    }

    /**
     * Verifica si es descuento por cantidad fija
     */
    public function getEsCantidadFijaAttribute(): bool
    {
        return $this->tipo_descuento === self::TIPO_CANTIDAD_FIJA;
    }

    /**
     * Verifica si tiene compra mínima requerida
     */
    public function getTieneCompraMinimaAttribute(): bool
    {
        return !is_null($this->compra_minima) && $this->compra_minima > 0;
    }

    /**
     * Obtiene el nombre del tipo de descuento
     */
    public function getTipoDescuentoNombreAttribute(): string
    {
        $tipos = [
            self::TIPO_PORCENTAJE => 'Porcentaje',
            self::TIPO_CANTIDAD_FIJA => 'Cantidad Fija'
        ];

        return $tipos[$this->tipo_descuento] ?? 'Desconocido';
    }

    /**
     * Obtiene la descripción del descuento
     */
    public function getDescripcionDescuentoAttribute(): string
    {
        $descripcion = '';

        if ($this->es_porcentaje) {
            $descripcion = "{$this->valor_descuento}% de descuento";
        } else {
            $descripcion = "S/ {$this->valor_descuento} de descuento";
        }

        if ($this->tiene_compra_minima) {
            $descripcion .= " (compra mínima: S/ {$this->compra_minima})";
        }

        return $descripcion;
    }

    // Métodos de cálculo

    /**
     * Calcula el descuento para un monto específico
     */
    public function calcularDescuento(float $montoCompra): float
    {
        // Verificar si cumple con la compra mínima
        if (!$this->cumpleCompraMinima($montoCompra)) {
            return 0;
        }

        if ($this->es_porcentaje) {
            // Descuento por porcentaje
            $descuento = ($montoCompra * $this->valor_descuento) / 100;
        } else {
            // Descuento por cantidad fija
            $descuento = $this->valor_descuento;
        }

        // El descuento no puede ser mayor al monto de la compra
        return min($descuento, $montoCompra);
    }

    /**
     * Calcula el monto final después del descuento
     */
    public function calcularMontoFinal(float $montoCompra): float
    {
        $descuento = $this->calcularDescuento($montoCompra);
        return max(0, $montoCompra - $descuento);
    }

    /**
     * Verifica si el monto cumple con la compra mínima
     */
    public function cumpleCompraMinima(float $montoCompra): bool
    {
        if (!$this->tiene_compra_minima) {
            return true;
        }

        return $montoCompra >= $this->compra_minima;
    }

    /**
     * Obtiene el porcentaje de descuento efectivo
     */
    public function getPorcentajeDescuentoEfectivo(float $montoCompra): float
    {
        if ($montoCompra <= 0) {
            return 0;
        }

        $descuento = $this->calcularDescuento($montoCompra);
        return ($descuento / $montoCompra) * 100;
    }

    // Métodos de utilidad

    /**
     * Verifica si la configuración es válida
     */
    public function esConfiguracionValida(): bool
    {
        // Valor de descuento debe ser positivo
        if ($this->valor_descuento <= 0) {
            return false;
        }

        // Si es porcentaje, no debe exceder 100%
        if ($this->es_porcentaje && $this->valor_descuento > 100) {
            return false;
        }

        // Compra mínima debe ser positiva si está definida
        if ($this->tiene_compra_minima && $this->compra_minima <= 0) {
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
            'tipo' => $this->tipo_descuento_nombre,
            'valor' => $this->valor_descuento,
            'descripcion' => $this->descripcion_descuento,
            'compra_minima' => [
                'requerida' => $this->tiene_compra_minima,
                'monto' => $this->compra_minima ?? 0
            ],
            'es_valida' => $this->esConfiguracionValida()
        ];
    }

    /**
     * Simula el descuento para diferentes montos
     */
    public function simularDescuentos(array $montos): array
    {
        $simulaciones = [];

        foreach ($montos as $monto) {
            $simulaciones[] = [
                'monto_original' => $monto,
                'cumple_minima' => $this->cumpleCompraMinima($monto),
                'descuento' => $this->calcularDescuento($monto),
                'monto_final' => $this->calcularMontoFinal($monto),
                'porcentaje_efectivo' => round($this->getPorcentajeDescuentoEfectivo($monto), 2)
            ];
        }

        return $simulaciones;
    }
}