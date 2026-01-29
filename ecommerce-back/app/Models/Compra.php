<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Compra extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo_compra',
        'cotizacion_id',
        'cliente_id',
        'user_cliente_id',
        'fecha_compra',
        'subtotal',
        'igv',
        'descuento_total',
        'total',
        'estado_compra_id',
        'metodo_pago',
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
        'aprobada_por',
        'fecha_aprobacion',
        'user_id',
        // Campos de facturación
        'requiere_factura',
        'datos_facturacion',
        'comprobante_id',
        'facturado_automaticamente'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'igv' => 'decimal:2',
        'descuento_total' => 'decimal:2',
        'total' => 'decimal:2',
        'costo_envio' => 'decimal:2',
        'fecha_compra' => 'datetime',
        'fecha_aprobacion' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'requiere_factura' => 'boolean',
        'datos_facturacion' => 'array',
        'facturado_automaticamente' => 'boolean'
    ];

    // Relación con cotización origen
    public function cotizacion()
    {
        return $this->belongsTo(Cotizacion::class, 'cotizacion_id');
    }

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

    // Relación con Estado de Compra
    public function estadoCompra()
    {
        return $this->belongsTo(EstadoCompra::class, 'estado_compra_id');
    }

    // Relación con Usuario que creó la compra
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Relación con Usuario que aprobó la compra
    public function aprobadaPor()
    {
        return $this->belongsTo(User::class, 'aprobada_por');
    }

    // Relación con Detalles de la Compra
    public function detalles()
    {
        return $this->hasMany(CompraDetalle::class, 'compra_id');
    }

    // Relación con Tracking de la Compra
    public function tracking()
    {
        return $this->hasMany(CompraTracking::class)->orderBy('fecha_cambio', 'asc');
    }

    // Relación con Comprobante
    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class, 'comprobante_id');
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

    // Accessor para obtener el tipo de compra
    public function getTipoCompraAttribute()
    {
        return $this->cotizacion_id ? 'Desde Cotización' : 'Directa';
    }

    // Verificar si es un envío a provincia
    public function esEnvioAProvincia(): bool
    {
        return $this->forma_envio === 'envio_provincia';
    }

    // Verificar si está aprobada
    public function estaAprobada(): bool
    {
        return in_array($this->estado_compra_id, [2, 3, 4, 5, 6]); // Aprobada, Pagada, En Preparación, Enviada, Entregada
    }

    // Verificar si puede ser cancelada
    public function puedeCancelarse(): bool
    {
        return in_array($this->estado_compra_id, [1, 2]); // Pendiente Aprobación, Aprobada
    }

    // Generar código de compra automático
    public static function generarCodigoCompra(): string
    {
        $fecha = date('Ymd');
        $contador = static::whereDate('created_at', today())->count() + 1;
        return 'COM-' . $fecha . '-' . str_pad($contador, 4, '0', STR_PAD_LEFT);
    }

    // Aprobar compra
    public function aprobar($usuarioId = null, $comentario = null)
    {
        $this->update([
            'estado_compra_id' => 2, // Aprobada
            'aprobada_por' => $usuarioId ?: auth()->id(),
            'fecha_aprobacion' => now()
        ]);

        // Crear registro de tracking
        CompraTracking::crearRegistro(
            $this->id,
            2, // Estado Aprobada
            $comentario ?: 'Compra aprobada por administrador',
            $usuarioId
        );

        return $this;
    }

    // Rechazar compra
    public function rechazar($usuarioId = null, $comentario = null)
    {
        $this->update([
            'estado_compra_id' => 8 // Rechazada
        ]);

        // Crear registro de tracking
        CompraTracking::crearRegistro(
            $this->id,
            8, // Estado Rechazada
            $comentario ?: 'Compra rechazada por administrador',
            $usuarioId
        );

        return $this;
    }

    // Crear compra desde cotización
    public static function crearDesdeCotizacion(Cotizacion $cotizacion, $metodosPago = null)
    {
        $compra = static::create([
            'codigo_compra' => static::generarCodigoCompra(),
            'cotizacion_id' => $cotizacion->id,
            'cliente_id' => $cotizacion->cliente_id,
            'user_cliente_id' => $cotizacion->user_cliente_id,
            'fecha_compra' => now(),
            'subtotal' => $cotizacion->subtotal,
            'igv' => $cotizacion->igv,
            'descuento_total' => $cotizacion->descuento_total,
            'total' => $cotizacion->total,
            'estado_compra_id' => 1, // Pendiente Aprobación
            'metodo_pago' => $metodosPago ?: $cotizacion->metodo_pago_preferido,
            'observaciones' => $cotizacion->observaciones,
            'direccion_envio' => $cotizacion->direccion_envio,
            'telefono_contacto' => $cotizacion->telefono_contacto,
            'numero_documento' => $cotizacion->numero_documento,
            'cliente_nombre' => $cotizacion->cliente_nombre,
            'cliente_email' => $cotizacion->cliente_email,
            'forma_envio' => $cotizacion->forma_envio,
            'costo_envio' => $cotizacion->costo_envio,
            'departamento_id' => $cotizacion->departamento_id,
            'provincia_id' => $cotizacion->provincia_id,
            'distrito_id' => $cotizacion->distrito_id,
            'departamento_nombre' => $cotizacion->departamento_nombre,
            'provincia_nombre' => $cotizacion->provincia_nombre,
            'distrito_nombre' => $cotizacion->distrito_nombre,
            'ubicacion_completa' => $cotizacion->ubicacion_completa,
            'user_id' => $cotizacion->user_id
        ]);

        // Copiar detalles de la cotización
        foreach ($cotizacion->detalles as $detalle) {
            CompraDetalle::create([
                'compra_id' => $compra->id,
                'producto_id' => $detalle->producto_id,
                'codigo_producto' => $detalle->codigo_producto,
                'nombre_producto' => $detalle->nombre_producto,
                'cantidad' => $detalle->cantidad,
                'precio_unitario' => $detalle->precio_unitario,
                'subtotal_linea' => $detalle->subtotal_linea
            ]);
        }

        // Crear registro inicial de tracking
        CompraTracking::crearRegistro(
            $compra->id,
            1, // Pendiente Aprobación
            'Compra creada desde cotización ' . $cotizacion->codigo_cotizacion,
            $cotizacion->user_id
        );

        return $compra;
    }

    // Obtener estados disponibles para esta compra
    public function getEstadosDisponibles()
    {
        $estadoActual = $this->estado_compra_id;

        switch ($estadoActual) {
            case 1: // Pendiente Aprobación
                return EstadoCompra::whereIn('id', [2, 8])->get(); // Aprobada, Rechazada
            case 2: // Aprobada
                return EstadoCompra::whereIn('id', [3, 7])->get(); // Pagada, Cancelada
            case 3: // Pagada
                return EstadoCompra::whereIn('id', [4])->get(); // En Preparación
            case 4: // En Preparación
                return EstadoCompra::whereIn('id', [5])->get(); // Enviada
            case 5: // Enviada
                return EstadoCompra::whereIn('id', [6])->get(); // Entregada
            default:
                return collect(); // Estados finales no permiten cambios
        }
    }

    // Scope para compras por usuario
    public function scopePorUsuario($query, $userId)
    {
        return $query->where('user_cliente_id', $userId);
    }

    // Scope para compras pendientes de aprobación
    public function scopePendientesAprobacion($query)
    {
        return $query->where('estado_compra_id', 1);
    }

    // Scope para compras activas (no canceladas ni rechazadas)
    public function scopeActivas($query)
    {
        return $query->whereNotIn('estado_compra_id', [7, 8]); // No canceladas ni rechazadas
    }

    // Verificar si requiere facturación
    public function requiereFacturacion(): bool
    {
        return $this->requiere_factura === true;
    }

    // Verificar si ya está facturada
    public function estaFacturada(): bool
    {
        return $this->comprobante_id !== null;
    }

    // Verificar si puede facturarse (está pagada y aún no tiene comprobante)
    public function puedeFacturarse(): bool
    {
        return $this->estado_compra_id == 3 && // Estado Pagada
               !$this->estaFacturada() &&
               $this->requiereFacturacion();
    }

    // Obtener datos de facturación completos
    public function getDatosFacturacionCompletos()
    {
        $datos = $this->datos_facturacion ?? [];

        // Si no hay datos de facturación y hay cliente, usar datos del cliente
        if (empty($datos) && $this->cliente_id) {
            return [
                'tipo_documento' => $this->cliente->tipo_documento ?? '1',
                'numero_documento' => $this->cliente->numero_documento ?? $this->numero_documento,
                'razon_social' => $this->cliente->razon_social ?? $this->cliente_nombre,
                'direccion' => $this->cliente->direccion ?? $this->direccion_envio,
                'email' => $this->cliente->email ?? $this->cliente_email,
                'telefono' => $this->cliente->telefono ?? $this->telefono_contacto
            ];
        }

        // Si no hay cliente pero hay userCliente
        if (empty($datos) && $this->user_cliente_id && $this->userCliente) {
            return [
                'tipo_documento' => $this->userCliente->tipo_documento ?? '1',
                'numero_documento' => $this->userCliente->numero_documento ?? $this->numero_documento,
                'razon_social' => $this->userCliente->nombres . ' ' . $this->userCliente->apellidos,
                'direccion' => $this->direccion_envio,
                'email' => $this->userCliente->email ?? $this->cliente_email,
                'telefono' => $this->telefono_contacto
            ];
        }

        return $datos;
    }

    // Validar que tenga datos suficientes para facturar
    public function tieneDatosParaFacturar(): bool
    {
        $datos = $this->getDatosFacturacionCompletos();

        return !empty($datos['numero_documento']) &&
               !empty($datos['razon_social']) &&
               !empty($datos['direccion']);
    }
}