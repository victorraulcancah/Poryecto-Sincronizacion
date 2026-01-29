<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaCliente extends Model
{
    use HasFactory;

    protected $table = 'recompensas_clientes';

    protected $fillable = [
        'recompensa_id',
        'segmento',
        'cliente_id'
    ];

    public $timestamps = false;

    // Tipos de segmentos disponibles
    const SEGMENTO_TODOS = 'todos';
    const SEGMENTO_NUEVOS = 'nuevos';
    const SEGMENTO_RECURRENTES = 'recurrentes';
    const SEGMENTO_VIP = 'vip';
    const SEGMENTO_NO_REGISTRADOS = 'no_registrados';

    public static function getSegmentos()
    {
        return [
            self::SEGMENTO_TODOS,
            self::SEGMENTO_NUEVOS,
            self::SEGMENTO_RECURRENTES,
            self::SEGMENTO_VIP,
            self::SEGMENTO_NO_REGISTRADOS
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

    /**
     * Cliente específico (si aplica)
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(UserCliente::class, 'cliente_id');
    }

    // Scopes

    /**
     * Scope para segmento específico
     */
    public function scopePorSegmento($query, $segmento)
    {
        return $query->where('segmento', $segmento);
    }

    /**
     * Scope para cliente específico
     */
    public function scopePorCliente($query, $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    // Accessors

    /**
     * Obtiene el nombre del segmento
     */
    public function getSegmentoNombreAttribute(): string
    {
        $segmentos = [
            self::SEGMENTO_TODOS => 'Todos los clientes',
            self::SEGMENTO_NUEVOS => 'Clientes nuevos',
            self::SEGMENTO_RECURRENTES => 'Clientes recurrentes',
            self::SEGMENTO_VIP => 'Clientes VIP',
            self::SEGMENTO_NO_REGISTRADOS => 'Clientes no registrados'
        ];

        return $segmentos[$this->segmento] ?? 'Desconocido';
    }

    /**
     * Verifica si es para un cliente específico
     */
    public function getEsClienteEspecificoAttribute(): bool
    {
        return !is_null($this->cliente_id);
    }

    // Métodos de utilidad

    /**
     * Verifica si un cliente cumple con este segmento
     */
    public function clienteCumpleSegmento(UserCliente $cliente): bool
    {
        // Si es cliente específico, verificar que coincida
        if ($this->es_cliente_especifico) {
            return $this->cliente_id === $cliente->id;
        }

        // Verificar según el tipo de segmento
        switch ($this->segmento) {
            case self::SEGMENTO_TODOS:
                return true;

            case self::SEGMENTO_NUEVOS:
                // Cliente registrado en los últimos 30 días
                return $cliente->created_at >= now()->subDays(30);

            case self::SEGMENTO_RECURRENTES:
                // Cliente con más de una compra
                return $cliente->pedidos()->count() > 1;

            case self::SEGMENTO_VIP:
                // Cliente con compras superiores a cierto monto (ejemplo: 1000 soles)
                $totalCompras = $cliente->pedidos()->sum('total');
                return $totalCompras >= 1000;

            case self::SEGMENTO_NO_REGISTRADOS:
                // Este segmento es exclusivo para visitantes no autenticados (público)
                // Nunca debe aplicar cuando evaluamos contra un UserCliente autenticado
                return false;

            default:
                return false;
        }
    }
}