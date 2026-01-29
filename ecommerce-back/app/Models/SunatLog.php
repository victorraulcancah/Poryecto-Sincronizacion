<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SunatLog extends Model
{
    use HasFactory;

    protected $table = 'sunat_logs';

    protected $fillable = [
        'comprobante_id',
        'tipo_operacion',
        'estado',
        'numero_ticket',
        'xml_enviado',
        'xml_respuesta',
        'cdr_respuesta',
        'hash_firma',
        'mensaje_sunat',
        'errores_sunat',
        'detalles_adicionales',
        'fecha_envio',
        'fecha_respuesta',
        'tiempo_respuesta_ms',
        'ip_origen',
        'user_id'
    ];

    protected $casts = [
        'detalles_adicionales' => 'array',
        'fecha_envio' => 'datetime',
        'fecha_respuesta' => 'datetime',
        'tiempo_respuesta_ms' => 'integer'
    ];

    // Relaciones
    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopePorEstado($query, $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopePorTipoOperacion($query, $tipo)
    {
        return $query->where('tipo_operacion', $tipo);
    }

    public function scopeRecientes($query, $dias = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($dias));
    }

    // Accessors
    public function getTiempoRespuestaFormateadoAttribute()
    {
        if (!$this->tiempo_respuesta_ms) {
            return 'N/A';
        }

        if ($this->tiempo_respuesta_ms < 1000) {
            return $this->tiempo_respuesta_ms . ' ms';
        }

        return round($this->tiempo_respuesta_ms / 1000, 2) . ' s';
    }

    public function getEstadoColorAttribute()
    {
        return match($this->estado) {
            'ACEPTADO' => 'success',
            'RECHAZADO' => 'danger',
            'ENVIADO' => 'warning',
            default => 'secondary'
        };
    }

    // Métodos estáticos para logging
    public static function logEnvio($comprobanteId, $xmlEnviado, $userId = null, $ipOrigen = null)
    {
        return self::create([
            'comprobante_id' => $comprobanteId,
            'tipo_operacion' => 'enviar',
            'xml_enviado' => $xmlEnviado,
            'fecha_envio' => now(),
            'user_id' => $userId,
            'ip_origen' => $ipOrigen
        ]);
    }

    public static function logRespuesta($comprobanteId, $estado, $numeroTicket, $xmlRespuesta, $cdrRespuesta, $mensaje, $errores = null, $tiempoRespuesta = null)
    {
        $log = self::where('comprobante_id', $comprobanteId)
                   ->where('tipo_operacion', 'enviar')
                   ->whereNull('fecha_respuesta')
                   ->latest()
                   ->first();

        if ($log) {
            $log->update([
                'estado' => $estado,
                'numero_ticket' => $numeroTicket,
                'xml_respuesta' => $xmlRespuesta,
                'cdr_respuesta' => $cdrRespuesta,
                'mensaje_sunat' => $mensaje,
                'errores_sunat' => $errores,
                'fecha_respuesta' => now(),
                'tiempo_respuesta_ms' => $tiempoRespuesta
            ]);

            return $log;
        }

        return null;
    }
}