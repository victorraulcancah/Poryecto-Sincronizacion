<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificacionEnviada extends Model
{
    use HasFactory;

    protected $table = 'notificaciones_enviadas';

    protected $fillable = [
        'venta_id',
        'comprobante_id',
        'tipo',
        'destinatario',
        'mensaje',
        'estado',
        'error',
        'fecha_envio',
    ];

    protected $casts = [
        'fecha_envio' => 'datetime',
    ];

    /**
     * Relación con Venta
     */
    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    /**
     * Relación con Comprobante
     */
    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    /**
     * Registrar envío exitoso
     */
    public static function registrarEnvio($ventaId, $tipo, $destinatario, $mensaje = null, $comprobanteId = null)
    {
        try {
            return self::create([
                'venta_id' => $ventaId,
                'comprobante_id' => $comprobanteId,
                'tipo' => $tipo,
                'destinatario' => $destinatario,
                'mensaje' => $mensaje,
                'estado' => 'ENVIADO',
                'fecha_envio' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::warning('No se pudo registrar envío de notificación', [
                'venta_id' => $ventaId,
                'tipo' => $tipo,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Registrar envío fallido
     */
    public static function registrarError($ventaId, $tipo, $destinatario, $error, $mensaje = null, $comprobanteId = null)
    {
        try {
            return self::create([
                'venta_id' => $ventaId,
                'comprobante_id' => $comprobanteId,
                'tipo' => $tipo,
                'destinatario' => $destinatario,
                'mensaje' => $mensaje,
                'estado' => 'FALLIDO',
                'error' => $error,
                'fecha_envio' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::warning('No se pudo registrar error de notificación', [
                'venta_id' => $ventaId,
                'tipo' => $tipo,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
