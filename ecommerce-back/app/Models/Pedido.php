<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pedido extends Model
{
    use HasFactory;

    /**
     * Estados del flujo del e-commerce (tabla estados_pedido).
     *
     * El pedido del cliente nace "En espera": es el único estado en el que
     * puede seguir editando su cotización. Un vendedor o administrador lo pasa
     * a "En preparación" —y ahí queda cerrado— o lo cancela.
     */
    public const ESTADO_EN_ESPERA = 10;
    public const ESTADO_EN_PREPARACION = 4;
    public const ESTADO_CANCELADO = 8;

    /**
     * Correlativo anual para los pedidos que no nacen de una cotización:
     * "PED-2026-00001".
     *
     * Va con prefijo a propósito. Los pedidos que sí vienen de una cotización
     * heredan su número ("2026-00003"), y `codigo_pedido` es único: sin el
     * prefijo, este contador podría tomar un número que después reclamara una
     * cotización, porque cada uno lleva su propia numeración.
     */
    public static function generarCodigoPedido(): string
    {
        $prefijo = 'PED-' . date('Y') . '-';

        $ultimo = static::where('codigo_pedido', 'like', $prefijo . '%')
            ->orderByDesc('codigo_pedido')
            ->lockForUpdate()
            ->value('codigo_pedido');

        $siguiente = $ultimo ? ((int) substr($ultimo, strlen($prefijo))) + 1 : 1;

        return $prefijo . str_pad((string) $siguiente, 5, '0', STR_PAD_LEFT);
    }

    protected $fillable = [
        'codigo_pedido',
        'cliente_id',
        'user_cliente_id',
        // Cotización que originó el pedido; es la que el cliente puede editar
        // mientras el pedido siga "En espera".
        'cotizacion_id',
        'fecha_pedido',
        'subtotal',
        'igv',
        'descuento_total',
        'total',
        'estado_pedido_id',
        // Cuándo dejó de estar "En espera"; con esto la bandeja lo saca del
        // listado al cierre del día.
        'atendido_at',
        'metodo_pago',
        'observaciones',
        'direccion_envio',
        'telefono_contacto',
        'user_id',
        // Nuevos campos
        'numero_documento',
        'cliente_nombre',
        'cliente_email',
        'forma_envio',
        'costo_envio',
        'moneda',
        'departamento_id',
        'provincia_id',
        'distrito_id',
        'departamento_nombre',
        'provincia_nombre',
        'distrito_nombre',
        'ubicacion_completa'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'igv' => 'decimal:2',
        'descuento_total' => 'decimal:2',
        'total' => 'decimal:2',
        'fecha_pedido' => 'datetime',
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

    // Relación con Estado del Pedido
    public function estadoPedido()
    {
        return $this->belongsTo(EstadoPedido::class, 'estado_pedido_id');
    }

    // Relación con Usuario que creó el pedido
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Relación con Detalles del Pedido
    public function detalles()
    {
        return $this->hasMany(PedidoDetalle::class, 'pedido_id');
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
        
        return 'Cliente no especificado';
    }

    // Accessor para obtener el tipo de pedido
    public function getTipoPedidoAttribute()
    {
        return $this->user_cliente_id ? 'E-commerce' : 'Tradicional';
    }

    // Relación con tracking
    public function tracking()
    {
        return $this->hasMany(PedidoTracking::class)->orderBy('fecha_cambio', 'asc');
    }

    // Desglose completo de métodos de pago (copiado de la cotización de origen)
    public function metodosPago()
    {
        return $this->hasMany(PedidoMetodoPago::class, 'pedido_id');
    }

    // Verificar si es un pedido a provincia
    public function esEnvioAProvincia(): bool
    {
        return $this->forma_envio === 'envio_provincia';
    }

    /**
     * Estados que se pueden elegir en el dashboard.
     *
     * El flujo del e-commerce tiene tres: el pedido nace "En espera" y de ahí
     * el vendedor solo puede pasarlo a "En preparación" o "Cancelado". La lista
     * ya no depende del tipo de envío; los estados viejos siguen en la tabla
     * porque hay pedidos antiguos que los referencian, pero no se ofrecen.
     */
    public function getEstadosDisponibles()
    {
        return EstadoPedido::whereIn('id', [
            self::ESTADO_EN_ESPERA,
            self::ESTADO_EN_PREPARACION,
            self::ESTADO_CANCELADO,
        ])->orderBy('orden')->get();
    }

    /**
     * Mientras está "En espera", el cliente todavía puede editar la cotización
     * que originó el pedido. Cualquier otro estado lo cierra.
     */
    public function esEditablePorCliente(): bool
    {
        return (int) $this->estado_pedido_id === self::ESTADO_EN_ESPERA;
    }

    /**
     * Bandeja de trabajo: lo que falta atender, más lo que se atendió hoy.
     *
     * Al pasar de medianoche los ya atendidos salen del listado, para que la
     * pantalla muestre solo pedidos que esperan una acción. No se borra nada:
     * siguen consultables pidiendo el historial.
     */
    public function scopePendientesDeAccion($query)
    {
        $hoy = now()->toDateString();

        return $query->where(function ($q) use ($hoy) {
            // En espera: solo los del día. A medianoche salen de la bandeja
            // aunque nadie los haya atendido.
            $q->where(function ($q) use ($hoy) {
                $q->where('estado_pedido_id', self::ESTADO_EN_ESPERA)
                    ->whereDate('fecha_pedido', $hoy);
            })
                // Ya atendidos: se quedan hasta el cierre del día en que se
                // atendieron.
                ->orWhere(function ($q) use ($hoy) {
                    $q->whereNotNull('atendido_at')
                        ->whereDate('atendido_at', $hoy);
                });
        });
    }
}