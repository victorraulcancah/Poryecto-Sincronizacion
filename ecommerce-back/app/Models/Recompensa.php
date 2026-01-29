<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Recompensa extends Model
{
    use HasFactory;

    protected $table = 'recompensas';

    protected $fillable = [
        'nombre',
        'descripcion',
        'tipo',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'creado_por'
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'estado' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Tipos de recompensas disponibles
    const TIPO_PUNTOS = 'puntos';
    const TIPO_DESCUENTO = 'descuento';
    const TIPO_ENVIO_GRATIS = 'envio_gratis';
    const TIPO_REGALO = 'regalo';

    // Estados de recompensas
    const ESTADO_PROGRAMADA = 'programada';
    const ESTADO_ACTIVA = 'activa';
    const ESTADO_PAUSADA = 'pausada';
    const ESTADO_EXPIRADA = 'expirada';
    const ESTADO_CANCELADA = 'cancelada';

    public static function getTipos()
    {
        return [
            self::TIPO_PUNTOS,
            self::TIPO_DESCUENTO,
            self::TIPO_ENVIO_GRATIS,
            self::TIPO_REGALO
        ];
    }

    public static function getEstados()
    {
        return [
            self::ESTADO_PROGRAMADA,
            self::ESTADO_ACTIVA,
            self::ESTADO_PAUSADA,
            self::ESTADO_EXPIRADA,
            self::ESTADO_CANCELADA
        ];
    }

    // Relaciones

    /**
     * Usuario que creó la recompensa
     */
    public function creador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    /**
     * Clientes asociados a esta recompensa
     */
    public function clientes(): HasMany
    {
        return $this->hasMany(RecompensaCliente::class);
    }

    /**
     * Productos asociados a esta recompensa
     */
    public function productos(): HasMany
    {
        return $this->hasMany(RecompensaProducto::class);
    }

    /**
     * Configuración de puntos (si aplica)
     */
    public function puntos(): HasMany
    {
        return $this->hasMany(RecompensaPuntos::class);
    }

    /**
     * Configuración de descuentos (si aplica)
     */
    public function descuentos(): HasMany
    {
        return $this->hasMany(RecompensaDescuento::class);
    }

    /**
     * Configuración de envíos (si aplica)
     */
    public function envios(): HasMany
    {
        return $this->hasMany(RecompensaEnvio::class);
    }

    /**
     * Configuración de regalos (si aplica)
     */
    public function regalos(): HasMany
    {
        return $this->hasMany(RecompensaRegalo::class);
    }

    /**
     * Historial de aplicaciones de esta recompensa
     */
    public function historial(): HasMany
    {
        return $this->hasMany(RecompensaHistorial::class);
    }

    /**
     * Popup asociado a esta recompensa
     */
    public function popup(): HasOne
    {
        return $this->hasOne(RecompensaPopup::class);
    }

    /**
     * Notificaciones enviadas de esta recompensa
     */
    public function notificaciones(): HasMany
    {
        return $this->hasMany(RecompensaNotificacionCliente::class);
    }

    // Scopes

    /**
     * Scope para recompensas activas
     */
    public function scopeActivas($query)
    {
        return $query->where('estado', self::ESTADO_ACTIVA);
    }

    /**
     * Scope para recompensas vigentes (dentro del rango de fechas)
     */
    public function scopeVigentes($query)
    {
        $now = now();
        return $query->where('fecha_inicio', '<=', $now)
                    ->where('fecha_fin', '>=', $now);
    }

    /**
     * Scope para recompensas por tipo
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    // Accessors

    /**
     * Verifica si la recompensa está vigente
     */
    public function getEsVigenteAttribute(): bool
    {
        $now = now();
        return $this->estado === self::ESTADO_ACTIVA && 
               $this->fecha_inicio <= $now && 
               $this->fecha_fin >= $now;
    }

    /**
     * Obtiene el nombre del tipo de recompensa
     */
    public function getTipoNombreAttribute(): string
    {
        $tipos = [
            self::TIPO_PUNTOS => 'Puntos',
            self::TIPO_DESCUENTO => 'Descuento',
            self::TIPO_ENVIO_GRATIS => 'Envío Gratis',
            self::TIPO_REGALO => 'Regalo'
        ];

        return $tipos[$this->tipo] ?? 'Desconocido';
    }

    /**
     * Obtiene el nombre del estado de recompensa
     */
    public function getEstadoNombreAttribute(): string
    {
        $estados = [
            self::ESTADO_PROGRAMADA => 'Programada',
            self::ESTADO_ACTIVA => 'Activa',
            self::ESTADO_PAUSADA => 'Pausada',
            self::ESTADO_EXPIRADA => 'Expirada',
            self::ESTADO_CANCELADA => 'Cancelada'
        ];

        return $estados[$this->estado] ?? 'Desconocido';
    }

    /**
     * Cuenta total de aplicaciones de esta recompensa
     */
    public function getTotalAplicacionesAttribute(): int
    {
        return $this->historial()->count();
    }

    // Métodos para gestión de estados

    /**
     * Activar la recompensa
     */
    public function activar(): bool
    {
        if ($this->puedeActivar()) {
            $this->estado = self::ESTADO_ACTIVA;
            return $this->save();
        }
        return false;
    }

    /**
     * Pausar la recompensa
     */
    public function pausar(): bool
    {
        if ($this->puedePausar()) {
            $this->estado = self::ESTADO_PAUSADA;
            return $this->save();
        }
        return false;
    }

    /**
     * Cancelar la recompensa
     */
    public function cancelar(): bool
    {
        if ($this->puedeCancelar()) {
            $this->estado = self::ESTADO_CANCELADA;
            return $this->save();
        }
        return false;
    }

    /**
     * Verificar si puede activar
     */
    public function puedeActivar(): bool
    {
        return in_array($this->estado, [self::ESTADO_PROGRAMADA, self::ESTADO_PAUSADA]);
    }

    /**
     * Verificar si puede pausar
     */
    public function puedePausar(): bool
    {
        return $this->estado === self::ESTADO_ACTIVA;
    }

    /**
     * Verificar si puede cancelar
     */
    public function puedeCancelar(): bool
    {
        return in_array($this->estado, [self::ESTADO_PROGRAMADA, self::ESTADO_ACTIVA, self::ESTADO_PAUSADA]);
    }
}