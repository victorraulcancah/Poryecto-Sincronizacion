<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Compra pagada por la pasarela de pago. Ver la migración de `pagos_en_linea`
 * para el porqué de que no viva en `pedidos`.
 */
class PagoEnLinea extends Model
{
    protected $table = 'pagos_en_linea';

    public const ESTADO_PAGADO = 'pagado';
    public const ESTADO_RECHAZADO = 'rechazado';

    /** Etapas del seguimiento manual (facturación en el ERP y delivery). */
    public const ESTADOS_PROCESO = [
        'pendiente_facturar',
        'facturado',
        'en_delivery',
        'entregado',
        'cancelado',
    ];

    protected $fillable = [
        'codigo',
        'user_cliente_id',
        'estado',
        'estado_proceso',
        'comprobante_erp',
        'notas_internas',
        'atendido_por',
        'atendido_at',
        'comprobante_archivo',
        'comprobante_nombre',
        'comprobante_enviado_at',
        'comprobante_enviado_por',
        'simulado',
        'pasarela',
        'referencia_pasarela',
        'mensaje_pasarela',
        'moneda',
        'subtotal',
        'igv',
        'cupon_codigo',
        'descuento',
        'costo_envio',
        'total',
        'items',
        'forma_envio',
        'cliente_nombre',
        'cliente_email',
        'numero_documento',
        'telefono_contacto',
        'direccion_envio',
        'departamento_nombre',
        'provincia_nombre',
        'distrito_nombre',
        'observaciones',
        'tarjeta_marca',
        'tarjeta_ultimos4',
        'email_enviado_at',
    ];

    protected $casts = [
        'simulado' => 'boolean',
        'items' => 'array',
        'subtotal' => 'float',
        'igv' => 'float',
        'descuento' => 'float',
        'costo_envio' => 'float',
        'total' => 'float',
        'email_enviado_at' => 'datetime',
        'atendido_at' => 'datetime',
        'comprobante_enviado_at' => 'datetime',
    ];

    public function userCliente(): BelongsTo
    {
        return $this->belongsTo(UserCliente::class, 'user_cliente_id');
    }

    /**
     * Correlativo anual: "PAGO-2026-00001".
     *
     * Va con su propio prefijo para no cruzarse con los números de pedidos y
     * cotizaciones. Se llama dentro de la transacción que crea el registro
     * (`lockForUpdate`), igual que `Pedido::generarCodigoPedido`.
     */
    public static function generarCodigo(): string
    {
        $prefijo = 'PAGO-' . date('Y') . '-';

        $ultimo = static::where('codigo', 'like', $prefijo . '%')
            ->orderByDesc('codigo')
            ->lockForUpdate()
            ->value('codigo');

        $siguiente = $ultimo ? ((int) substr($ultimo, strlen($prefijo))) + 1 : 1;

        return $prefijo . str_pad((string) $siguiente, 5, '0', STR_PAD_LEFT);
    }
}
