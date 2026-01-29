<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecompensaNotificacionCliente extends Model
{
    use HasFactory;

    protected $table = 'recompensas_notificaciones_clientes';
    
    protected $fillable = [
        'recompensa_id',
        'cliente_id',
        'popup_id',
        'fecha_notificacion',
        'fecha_visualizacion',
        'fecha_cierre',
        'estado'
    ];

    protected $casts = [
        'fecha_notificacion' => 'datetime',
        'fecha_visualizacion' => 'datetime',
        'fecha_cierre' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Estados disponibles
    const ESTADO_ENVIADA = 'enviada';
    const ESTADO_VISTA = 'vista';
    const ESTADO_CERRADA = 'cerrada';
    const ESTADO_EXPIRADA = 'expirada';

    public static function getEstados()
    {
        return [
            self::ESTADO_ENVIADA,
            self::ESTADO_VISTA,
            self::ESTADO_CERRADA,
            self::ESTADO_EXPIRADA
        ];
    }

    // Relaciones

    /**
     * Recompensa relacionada
     */
    public function recompensa(): BelongsTo
    {
        return $this->belongsTo(Recompensa::class);
    }

    /**
     * Cliente que recibió la notificación
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(UserCliente::class, 'cliente_id');
    }

    /**
     * Popup relacionado
     */
    public function popup(): BelongsTo
    {
        return $this->belongsTo(RecompensaPopup::class, 'popup_id');
    }

    // Scopes

    /**
     * Scope para notificaciones por estado
     */
    public function scopePorEstado($query, $estado)
    {
        return $query->where('estado', $estado);
    }

    /**
     * Scope para notificaciones de un cliente
     */
    public function scopeDelCliente($query, $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    /**
     * Scope para notificaciones de una recompensa
     */
    public function scopeDeRecompensa($query, $recompensaId)
    {
        return $query->where('recompensa_id', $recompensaId);
    }

    /**
     * Scope para notificaciones activas (no expiradas)
     */
    public function scopeActivas($query)
    {
        return $query->where('estado', '!=', self::ESTADO_EXPIRADA);
    }

    // Métodos de estado

    /**
     * Marcar notificación como vista
     */
    public function marcarComoVista(): bool
    {
        $this->estado = self::ESTADO_VISTA;
        $this->fecha_visualizacion = now();
        return $this->save();
    }

    /**
     * Marcar notificación como cerrada
     */
    public function marcarComoCerrada(): bool
    {
        $this->estado = self::ESTADO_CERRADA;
        $this->fecha_cierre = now();
        return $this->save();
    }

    /**
     * Marcar notificación como expirada
     */
    public function marcarComoExpirada(): bool
    {
        $this->estado = self::ESTADO_EXPIRADA;
        return $this->save();
    }

    /**
     * Verificar si la notificación está activa
     */
    public function estaActiva(): bool
    {
        return $this->estado !== self::ESTADO_EXPIRADA;
    }

    /**
     * Verificar si la notificación fue vista
     */
    public function fueVista(): bool
    {
        return in_array($this->estado, [self::ESTADO_VISTA, self::ESTADO_CERRADA]);
    }

    /**
     * Verificar si la notificación fue cerrada
     */
    public function fueCerrada(): bool
    {
        return $this->estado === self::ESTADO_CERRADA;
    }

    /**
     * Obtener tiempo transcurrido desde la notificación
     */
    public function getTiempoTranscurridoAttribute(): string
    {
        return $this->fecha_notificacion->diffForHumans();
    }

    /**
     * Obtener tiempo de visualización (si fue vista)
     */
    public function getTiempoVisualizacionAttribute(): ?string
    {
        if ($this->fecha_visualizacion) {
            return $this->fecha_notificacion->diffForHumans($this->fecha_visualizacion);
        }
        return null;
    }

    /**
     * Obtener tiempo de cierre (si fue cerrada)
     */
    public function getTiempoCierreAttribute(): ?string
    {
        if ($this->fecha_cierre) {
            return $this->fecha_notificacion->diffForHumans($this->fecha_cierre);
        }
        return null;
    }

    /**
     * Obtener estadísticas de la notificación
     */
    public function getEstadisticas(): array
    {
        return [
            'estado' => $this->estado,
            'estado_nombre' => ucfirst($this->estado),
            'fecha_notificacion' => $this->fecha_notificacion,
            'fecha_visualizacion' => $this->fecha_visualizacion,
            'fecha_cierre' => $this->fecha_cierre,
            'tiempo_transcurrido' => $this->tiempo_transcurrido,
            'tiempo_visualizacion' => $this->tiempo_visualizacion,
            'tiempo_cierre' => $this->tiempo_cierre,
            'fue_vista' => $this->fueVista(),
            'fue_cerrada' => $this->fueCerrada(),
            'esta_activa' => $this->estaActiva()
        ];
    }
}
