<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaEnvio extends Model
{
    use HasFactory;

    protected $table = 'recompensas_envios';

    protected $fillable = [
        'recompensa_id',
        'minimo_compra',
        'zonas_aplicables'
    ];

    protected $casts = [
        'minimo_compra' => 'decimal:2',
        'zonas_aplicables' => 'array'
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

    // Scopes

    /**
     * Scope para envíos con monto mínimo
     */
    public function scopeConMontoMinimo($query)
    {
        return $query->where('minimo_compra', '>', 0);
    }

    /**
     * Scope para envíos sin restricción de monto
     */
    public function scopeSinMontoMinimo($query)
    {
        return $query->where('minimo_compra', '<=', 0)->orWhereNull('minimo_compra');
    }

    /**
     * Scope para envíos con zonas específicas
     */
    public function scopeConZonasEspecificas($query)
    {
        return $query->whereNotNull('zonas_aplicables');
    }

    /**
     * Scope para envíos a todas las zonas
     */
    public function scopeTodasLasZonas($query)
    {
        return $query->whereNull('zonas_aplicables');
    }

    // Accessors

    /**
     * Verifica si tiene monto mínimo requerido
     */
    public function getTieneMontoMinimoAttribute(): bool
    {
        return !is_null($this->minimo_compra) && $this->minimo_compra > 0;
    }

    /**
     * Verifica si tiene zonas específicas
     */
    public function getTieneZonasEspecificasAttribute(): bool
    {
        return !is_null($this->zonas_aplicables) && !empty($this->zonas_aplicables);
    }

    /**
     * Verifica si aplica a todas las zonas
     */
    public function getAplicaTodasZonasAttribute(): bool
    {
        return !$this->tiene_zonas_especificas;
    }

    /**
     * Obtiene la descripción del envío gratuito
     */
    public function getDescripcionEnvioAttribute(): string
    {
        $descripcion = 'Envío gratuito';

        if ($this->tiene_monto_minimo) {
            $descripcion .= " para compras desde S/ {$this->minimo_compra}";
        }

        if ($this->tiene_zonas_especificas) {
            $cantidadZonas = count($this->zonas_aplicables);
            $descripcion .= " (aplicable a {$cantidadZonas} zona" . ($cantidadZonas > 1 ? 's' : '') . ' específica' . ($cantidadZonas > 1 ? 's' : '') . ')';
        } else {
            $descripcion .= ' (todas las zonas)';
        }

        return $descripcion;
    }

    /**
     * Obtiene la lista de códigos de zona
     */
    public function getCodigosZonaAttribute(): array
    {
        return $this->zonas_aplicables ?? [];
    }

    /**
     * Obtiene la cantidad de zonas aplicables
     */
    public function getCantidadZonasAttribute(): int
    {
        return count($this->codigos_zona);
    }

    // Métodos de validación

    /**
     * Verifica si el monto cumple con el mínimo requerido
     */
    public function cumpleMontoMinimo(float $montoCompra): bool
    {
        if (!$this->tiene_monto_minimo) {
            return true;
        }

        return $montoCompra >= $this->minimo_compra;
    }

    /**
     * Verifica si una zona específica está incluida
     */
    public function incluyeZona(string $codigoZona): bool
    {
        if ($this->aplica_todas_zonas) {
            return true;
        }

        return in_array($codigoZona, $this->codigos_zona);
    }

    /**
     * Verifica si aplica envío gratuito para una compra y zona específica
     */
    public function aplicaEnvioGratuito(float $montoCompra, string $codigoZona = null): bool
    {
        // Verificar monto mínimo
        if (!$this->cumpleMontoMinimo($montoCompra)) {
            return false;
        }

        // Verificar zona (si se especifica)
        if (!is_null($codigoZona) && !$this->incluyeZona($codigoZona)) {
            return false;
        }

        return true;
    }

    // Métodos de utilidad

    /**
     * Agrega una zona a la lista de zonas aplicables
     */
    public function agregarZona(string $codigoZona): void
    {
        $zonas = $this->codigos_zona;
        
        if (!in_array($codigoZona, $zonas)) {
            $zonas[] = $codigoZona;
            $this->zonas_aplicables = $zonas;
        }
    }

    /**
     * Remueve una zona de la lista de zonas aplicables
     */
    public function removerZona(string $codigoZona): void
    {
        $zonas = $this->codigos_zona;
        $index = array_search($codigoZona, $zonas);
        
        if ($index !== false) {
            unset($zonas[$index]);
            $this->zonas_aplicables = array_values($zonas);
        }
    }

    /**
     * Establece múltiples zonas aplicables
     */
    public function establecerZonas(array $codigosZona): void
    {
        $this->zonas_aplicables = array_unique($codigosZona);
    }

    /**
     * Limpia todas las zonas (aplica a todas)
     */
    public function limpiarZonas(): void
    {
        $this->zonas_aplicables = null;
    }

    /**
     * Obtiene información detallada de las zonas
     */
    public function getInformacionZonas(): array
    {
        if ($this->aplica_todas_zonas) {
            return [
                'tipo' => 'todas',
                'descripcion' => 'Aplica a todas las zonas',
                'zonas' => []
            ];
        }

        // Obtener información de ubigeo para las zonas específicas
        $zonasInfo = [];
        foreach ($this->codigos_zona as $codigo) {
            $ubigeo = UbigeoInei::where('id_ubigeo', $codigo)->first();
            $zonasInfo[] = [
                'codigo' => $codigo,
                'nombre' => $ubigeo ? $ubigeo->nombre : "Zona {$codigo}"
            ];
        }

        return [
            'tipo' => 'especificas',
            'descripcion' => "Aplica a {$this->cantidad_zonas} zona(s) específica(s)",
            'zonas' => $zonasInfo
        ];
    }

    /**
     * Verifica si la configuración es válida
     */
    public function esConfiguracionValida(): bool
    {
        // Monto mínimo debe ser positivo si está definido
        if ($this->tiene_monto_minimo && $this->minimo_compra <= 0) {
            return false;
        }

        // Si hay zonas específicas, debe haber al menos una
        if ($this->tiene_zonas_especificas && empty($this->codigos_zona)) {
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
            'descripcion' => $this->descripcion_envio,
            'monto_minimo' => [
                'requerido' => $this->tiene_monto_minimo,
                'valor' => $this->minimo_compra ?? 0
            ],
            'zonas' => $this->getInformacionZonas(),
            'es_valida' => $this->esConfiguracionValida()
        ];
    }
}