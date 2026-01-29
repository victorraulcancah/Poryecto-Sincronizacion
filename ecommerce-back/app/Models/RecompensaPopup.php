<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecompensaPopup extends Model
{
    use HasFactory;

    protected $table = 'recompensas_popups';
    
    protected $fillable = [
        'recompensa_id',
        'titulo',
        'descripcion',
        'imagen_popup',
        'texto_boton',
        'url_destino',
        'mostrar_cerrar',
        'auto_cerrar_segundos',
        'popup_activo'
    ];

    protected $casts = [
        'mostrar_cerrar' => 'boolean',
        'popup_activo' => 'boolean',
        'auto_cerrar_segundos' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones

    /**
     * Recompensa a la que pertenece el popup
     */
    public function recompensa(): BelongsTo
    {
        return $this->belongsTo(Recompensa::class);
    }

    /**
     * Notificaciones enviadas de este popup
     */
    public function notificaciones(): HasMany
    {
        return $this->hasMany(RecompensaNotificacionCliente::class, 'popup_id');
    }

    // Scopes

    /**
     * Scope para popups activos
     */
    public function scopeActivos($query)
    {
        return $query->where('popup_activo', true);
    }

    /**
     * Scope para popups de recompensas activas
     */
    public function scopeDeRecompensasActivas($query)
    {
        return $query->whereHas('recompensa', function($q) {
            $q->where('estado', Recompensa::ESTADO_ACTIVA)
              ->where('fecha_inicio', '<=', now())
              ->where('fecha_fin', '>=', now());
        });
    }

    // Métodos de utilidad

    /**
     * Generar URL automática basada en la recompensa
     */
    public function generarUrlAutomatica(): string
    {
        return "/recompensas/{$this->recompensa_id}";
    }

    /**
     * Verificar si el popup está activo y su recompensa es válida
     */
    public function estaActivo(): bool
    {
        return $this->popup_activo && 
               $this->recompensa->estado === Recompensa::ESTADO_ACTIVA &&
               $this->recompensa->fecha_inicio <= now() &&
               $this->recompensa->fecha_fin >= now();
    }

    /**
     * Obtener URL de destino (automática si no se especifica)
     */
    public function getUrlDestinoAttribute($value): string
    {
        return $value ?: $this->generarUrlAutomatica();
    }

    /**
     * Obtener texto del botón (por defecto si no se especifica)
     */
    public function getTextoBotonAttribute($value): string
    {
        return $value ?: 'Ver más';
    }

    /**
     * Verificar si tiene auto-cierre configurado
     */
    public function tieneAutoCierre(): bool
    {
        return !is_null($this->auto_cerrar_segundos) && $this->auto_cerrar_segundos > 0;
    }

    /**
     * Obtener configuración del popup para el frontend
     */
    public function getConfiguracionFrontend(): array
    {
        return [
            'id' => $this->id,
            'recompensa_id' => $this->recompensa_id,
            'titulo' => $this->titulo,
            'descripcion' => $this->descripcion,
            'imagen_popup' => $this->imagen_popup,
            'imagen_popup_url' => $this->imagen_popup ? asset('storage/popups/' . $this->imagen_popup) : null,
            'texto_boton' => $this->texto_boton,
            'url_destino' => $this->url_destino,
            'mostrar_cerrar' => $this->mostrar_cerrar,
            'auto_cerrar_segundos' => $this->auto_cerrar_segundos,
            'popup_activo' => $this->popup_activo,
            'recompensa' => [
                'id' => $this->recompensa->id,
                'nombre' => $this->recompensa->nombre,
                'tipo' => $this->recompensa->tipo,
                'tipo_nombre' => $this->recompensa->tipo_nombre,
                'fecha_inicio' => $this->recompensa->fecha_inicio,
                'fecha_fin' => $this->recompensa->fecha_fin
            ]
        ];
    }
}
