<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cotizacion extends Model
{
    use HasFactory;

    protected $table = 'cotizaciones';

    protected $fillable = [
        'codigo_cotizacion',
        'cliente_id',
        'user_cliente_id',
        'fecha_cotizacion',
        'subtotal',
        'igv',
        'descuento_total',
        'total',
        'estado_cotizacion_id',
        'metodo_pago_preferido',
        'observaciones',
        'direccion_envio',
        'telefono_contacto',
        'numero_documento',
        'cliente_nombre',
        'cliente_email',
        'forma_envio',
        'costo_envio',
        'departamento_id',
        'provincia_id',
        'distrito_id',
        'departamento_nombre',
        'provincia_nombre',
        'distrito_nombre',
        'ubicacion_completa',
        'fecha_vencimiento',
        'user_id'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'igv' => 'decimal:2',
        'descuento_total' => 'decimal:2',
        'total' => 'decimal:2',
        'costo_envio' => 'decimal:2',
        'fecha_cotizacion' => 'datetime',
        'fecha_vencimiento' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relación con Cliente (para ventas tradicionales)
    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    // Relación con UserCliente (para e-commerce)
    public function userCliente()
    {
        return $this->belongsTo(UserCliente::class, 'user_cliente_id');
    }

    // Relación con Estado de Cotización
    public function estadoCotizacion()
    {
        return $this->belongsTo(EstadoCotizacion::class, 'estado_cotizacion_id');
    }

    // Relación con Usuario que creó la cotización
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Relación con Detalles de la Cotización
    public function detalles()
    {
        return $this->hasMany(CotizacionDetalle::class, 'cotizacion_id');
    }

    // Relación con Tracking de la Cotización
    public function tracking()
    {
        return $this->hasMany(CotizacionTracking::class)->orderBy('fecha_cambio', 'asc');
    }

    // Relación con Compras generadas desde esta cotización
    public function compras()
    {
        return $this->hasMany(Compra::class, 'cotizacion_id');
    }

    // Accessor para obtener el nombre del cliente
    public function getClienteNombreAttribute()
    {
        if ($this->userCliente) {
            return $this->userCliente->nombres . ' ' . $this->userCliente->apellidos;
        }

        if ($this->cliente) {
            return $this->cliente->razon_social ?: $this->cliente->nombre_comercial;
        }

        return $this->attributes['cliente_nombre'] ?? 'Cliente no especificado';
    }

    // Accessor para obtener el tipo de cotización
    public function getTipoCotizacionAttribute()
    {
        return $this->user_cliente_id ? 'E-commerce' : 'Tradicional';
    }

    // Verificar si es un envío a provincia
    public function esEnvioAProvincia(): bool
    {
        return $this->forma_envio === 'envio_provincia';
    }

    // Verificar si la cotización está vencida
    public function estaVencida(): bool
    {
        if (!$this->fecha_vencimiento) {
            return false;
        }
        return now() > $this->fecha_vencimiento;
    }

    // Verificar si puede convertirse a compra
    public function puedeConvertirseACompra(): bool
    {
        return $this->estadoCotizacion && $this->estadoCotizacion->permite_conversion && !$this->estaVencida();
    }

    // Generar código de cotización automático
    public static function generarCodigoCotizacion(): string
    {
        $fecha = date('Ymd');
        $contador = static::whereDate('created_at', today())->count() + 1;
        return 'COT-' . $fecha . '-' . str_pad($contador, 4, '0', STR_PAD_LEFT);
    }

    // Establecer fecha de vencimiento automática (7 días por defecto)
    public function establecerFechaVencimiento(int $dias = 7): void
    {
        $this->fecha_vencimiento = $this->fecha_cotizacion->addDays($dias);
        $this->save();
    }

    // Obtener estados disponibles para esta cotización
    public function getEstadosDisponibles()
    {
        $estadoActual = $this->estado_cotizacion_id;

        // Lógica de flujo de estados
        switch ($estadoActual) {
            case 1: // Pendiente
                return EstadoCotizacion::whereIn('id', [2, 4, 8])->get(); // En Revisión, Rechazada, Cancelada
            case 2: // En Revisión
                return EstadoCotizacion::whereIn('id', [3, 4])->get(); // Aprobada, Rechazada
            case 3: // Aprobada
                return EstadoCotizacion::whereIn('id', [5, 8])->get(); // Enviada para Compra, Cancelada
            case 5: // Enviada para Compra
                return EstadoCotizacion::whereIn('id', [6, 7])->get(); // Convertida a Compra, Vencida
            default:
                return collect(); // Estados finales no permiten cambios
        }
    }

    // Scope para cotizaciones por usuario
    public function scopePorUsuario($query, $userId)
    {
        return $query->where('user_cliente_id', $userId);
    }

    // Scope para cotizaciones activas (no vencidas ni canceladas)
    public function scopeActivas($query)
    {
        return $query->whereNotIn('estado_cotizacion_id', [6, 7, 8]); // No convertidas, vencidas ni canceladas
    }

    // Scope para cotizaciones pendientes de revisión
    public function scopePendientesRevision($query)
    {
        return $query->whereIn('estado_cotizacion_id', [1, 2]); // Pendiente, En Revisión
    }
}