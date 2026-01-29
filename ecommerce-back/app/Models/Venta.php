<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo_venta',
        'cliente_id',
        'user_cliente_id', // AGREGADO para e-commerce
        'fecha_venta',
        'subtotal',
        'igv',
        'descuento_total',
        'total',
        'estado',
        'comprobante_id',
        'requiere_factura',
        'metodo_pago',
        'observaciones',
        'user_id'
    ];

    protected $casts = [
        'fecha_venta' => 'datetime',
        'subtotal' => 'decimal:2',
        'igv' => 'decimal:2',
        'descuento_total' => 'decimal:2',
        'total' => 'decimal:2',
        'requiere_factura' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function userCliente()
    {
        return $this->belongsTo(UserCliente::class, 'user_cliente_id');
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function detalles()
    {
        return $this->hasMany(VentaDetalle::class);
    }

    public function metodosPago()
    {
        return $this->hasMany(VentaMetodoPago::class);
    }

    // Scopes
    public function scopePorEstado($query, $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopePendientesFacturacion($query)
    {
        return $query->where('estado', 'PENDIENTE')
                     ->where('requiere_factura', true);
    }

    public function scopePorFecha($query, $fecha_inicio, $fecha_fin = null)
    {
        if ($fecha_fin) {
            return $query->whereBetween('fecha_venta', [$fecha_inicio, $fecha_fin]);
        }
        return $query->whereDate('fecha_venta', $fecha_inicio);
    }

    public function scopeEcommerce($query)
    {
        return $query->whereNotNull('user_cliente_id');
    }

    public function scopeTradicional($query)
    {
        return $query->whereNotNull('cliente_id');
    }

    // Accessors
    public function getEstadoColorAttribute()
    {
        $colores = [
            'PENDIENTE' => 'yellow',
            'FACTURADO' => 'green',
            'ANULADO' => 'red'
        ];

        return $colores[$this->estado] ?? 'gray';
    }

    public function getClienteNombreAttribute()
    {
        if ($this->userCliente) {
            return $this->userCliente->nombre_completo;
        }
        
        if ($this->cliente) {
            return $this->cliente->nombre_completo;
        }
        
        return 'Cliente no especificado';
    }

    public function getTipoVentaAttribute()
    {
        return $this->user_cliente_id ? 'E-commerce' : 'Tradicional';
    }

    public function getEsPagoMixtoAttribute()
    {
        return $this->metodosPago()->count() > 1;
    }

    public function getMetodoPagoDisplayAttribute()
    {
        if ($this->es_pago_mixto) {
            return 'MIXTO';
        }
        return $this->metodo_pago ?? 'No especificado';
    }

    // Métodos de utilidad
    public static function generarCodigoVenta()
    {
        do {
            $codigo = 'V' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (self::where('codigo_venta', $codigo)->exists());

        return $codigo;
    }

    public function puedeFacturar()
    {
        return $this->estado === 'PENDIENTE' && $this->comprobante_id === null;
    }

    public function puedeAnular()
    {
        return in_array($this->estado, ['PENDIENTE', 'FACTURADO']);
    }

    public function puedeEditar()
    {
        // Solo se puede editar si está PENDIENTE y NO tiene comprobante
        return $this->estado === 'PENDIENTE' && $this->comprobante_id === null;
    }

    public function getClienteParaFacturacion()
    {
        // Si es una venta de e-commerce, usar el cliente de facturación del UserCliente
        if ($this->userCliente && $this->userCliente->cliente_facturacion_id) {
            return $this->userCliente->clienteFacturacion;
        }
        
        // Si es venta tradicional, usar el cliente directo
        if ($this->cliente) {
            return $this->cliente;
        }
        
        return null;
    }

    // Boot method
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($venta) {
            if (!$venta->codigo_venta) {
                $venta->codigo_venta = self::generarCodigoVenta();
            }
        });
    }
}