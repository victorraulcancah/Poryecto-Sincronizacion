<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaPuntos extends Model
{
    use HasFactory;

    protected $table = 'recompensas_puntos';

    protected $fillable = [
        'recompensa_id',
        'puntos_por_compra',
        'puntos_por_monto',
        'puntos_registro'
    ];

    protected $casts = [
        'puntos_por_compra' => 'decimal:2',
        'puntos_por_monto' => 'decimal:2',
        'puntos_registro' => 'decimal:2'
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

    // Accessors

    /**
     * Verifica si otorga puntos por compra
     */
    public function getOtorgaPuntosPorCompraAttribute(): bool
    {
        return $this->puntos_por_compra > 0;
    }

    /**
     * Verifica si otorga puntos por monto gastado
     */
    public function getOtorgaPuntosPorMontoAttribute(): bool
    {
        return $this->puntos_por_monto > 0;
    }

    /**
     * Verifica si otorga puntos por registro
     */
    public function getOtorgaPuntosPorRegistroAttribute(): bool
    {
        return $this->puntos_registro > 0;
    }

    /**
     * Obtiene el total de puntos configurados
     */
    public function getTotalPuntosConfiguradosAttribute(): float
    {
        return $this->puntos_por_compra + $this->puntos_por_monto + $this->puntos_registro;
    }

    // Métodos de cálculo

    /**
     * Calcula puntos por una compra específica
     */
    public function calcularPuntosPorCompra(float $montoCompra, int $cantidadItems = 1): float
    {
        $puntos = 0;

        // Puntos fijos por compra realizada
        if ($this->otorga_puntos_por_compra) {
            $puntos += $this->puntos_por_compra;
        }

        // Puntos por monto gastado (ejemplo: 1 punto por cada 10 soles)
        if ($this->otorga_puntos_por_monto && $this->puntos_por_monto > 0) {
            // Asumiendo que puntos_por_monto representa "puntos por cada X soles"
            // Si puntos_por_monto = 1, significa 1 punto por cada sol
            // Si puntos_por_monto = 0.1, significa 1 punto por cada 10 soles
            $puntos += $montoCompra * $this->puntos_por_monto;
        }

        return round($puntos, 2);
    }

    /**
     * Calcula puntos por registro de nuevo cliente
     */
    public function calcularPuntosPorRegistro(): float
    {
        return $this->otorga_puntos_por_registro ? $this->puntos_registro : 0;
    }

    /**
     * Obtiene la descripción de la configuración de puntos
     */
    public function getDescripcionConfiguracionAttribute(): string
    {
        $descripciones = [];

        if ($this->otorga_puntos_por_compra) {
            $descripciones[] = "{$this->puntos_por_compra} puntos por cada compra";
        }

        if ($this->otorga_puntos_por_monto) {
            if ($this->puntos_por_monto >= 1) {
                $descripciones[] = "{$this->puntos_por_monto} puntos por cada sol gastado";
            } else {
                $solesRequeridos = round(1 / $this->puntos_por_monto, 0);
                $descripciones[] = "1 punto por cada {$solesRequeridos} soles gastados";
            }
        }

        if ($this->otorga_puntos_por_registro) {
            $descripciones[] = "{$this->puntos_registro} puntos por registro";
        }

        return empty($descripciones) ? 'Sin configuración de puntos' : implode(', ', $descripciones);
    }

    // Métodos de utilidad

    /**
     * Verifica si la configuración es válida
     */
    public function esConfiguracionValida(): bool
    {
        return $this->puntos_por_compra >= 0 && 
               $this->puntos_por_monto >= 0 && 
               $this->puntos_registro >= 0 &&
               $this->total_puntos_configurados > 0;
    }

    /**
     * Obtiene un resumen de la configuración
     */
    public function getResumenConfiguracion(): array
    {
        return [
            'puntos_por_compra' => [
                'valor' => $this->puntos_por_compra,
                'activo' => $this->otorga_puntos_por_compra,
                'descripcion' => $this->otorga_puntos_por_compra ? "{$this->puntos_por_compra} puntos por compra" : 'Inactivo'
            ],
            'puntos_por_monto' => [
                'valor' => $this->puntos_por_monto,
                'activo' => $this->otorga_puntos_por_monto,
                'descripcion' => $this->otorga_puntos_por_monto ? 
                    ($this->puntos_por_monto >= 1 ? "{$this->puntos_por_monto} puntos por sol" : "1 punto por cada " . round(1 / $this->puntos_por_monto, 0) . " soles") : 
                    'Inactivo'
            ],
            'puntos_registro' => [
                'valor' => $this->puntos_registro,
                'activo' => $this->otorga_puntos_por_registro,
                'descripcion' => $this->otorga_puntos_por_registro ? "{$this->puntos_registro} puntos por registro" : 'Inactivo'
            ]
        ];
    }
}