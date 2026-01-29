<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GuiaRemision extends Model
{
    use HasFactory;

    protected $table = 'guias_remision';

    // Constantes de estado (consistente con comprobantes y comprobantes_sunat)
    const ESTADO_PENDIENTE = 'PENDIENTE';
    const ESTADO_ACEPTADO = 'ACEPTADO';
    const ESTADO_RECHAZADO = 'RECHAZADO';
    const ESTADO_ANULADO = 'ANULADO';

    // Estados logísticos (para el seguimiento físico del traslado)
    const ESTADO_LOGISTICO_PENDIENTE = 'pendiente';
    const ESTADO_LOGISTICO_EN_TRANSITO = 'en_transito';
    const ESTADO_LOGISTICO_ENTREGADO = 'entregado';
    const ESTADO_LOGISTICO_DEVUELTO = 'devuelto';
    const ESTADO_LOGISTICO_ANULADO = 'anulado';

    protected $fillable = [
        // Comprobante
        'tipo_comprobante',
        'serie',
        'correlativo',
        'fecha_emision',
        
        // Tipo de guía
        'tipo_guia',
        'requiere_sunat',

        // Fechas
        'fecha_inicio_traslado',

        // Referencias
        'user_id',
        'venta_id',
        'comprobante_tipo',
        'comprobante_serie',
        'comprobante_numero',

        // Cliente (solo REMITENTE)
        'cliente_id',
        'cliente_tipo_documento',
        'cliente_numero_documento',
        'cliente_razon_social',
        // cliente_direccion - ELIMINADO (usar punto_partida_direccion)

        // Destinatario
        'destinatario_tipo_documento',
        'destinatario_numero_documento',
        'destinatario_razon_social',
        'destinatario_direccion',
        'destinatario_ubigeo',

        // Traslado
        'motivo_traslado',
        'modalidad_traslado',
        'peso_total',
        'numero_bultos',

        // Transporte
        'modo_transporte',
        'numero_placa',
        // numero_licencia - ELIMINADO (SUNAT no lo requiere)
        'conductor_dni',
        'conductor_nombres',
        // constancia_mtc - ELIMINADO (no se valida en SUNAT)

        // Transportista (cuando tipo_guia = TRANSPORTISTA)
        'transportista_ruc',
        'transportista_razon_social',
        'transportista_numero_mtc',
        'conductor_tipo_documento',
        'conductor_numero_documento',
        'conductor_apellidos',
        'conductor_licencia',
        'vehiculo_placa_principal',
        'vehiculo_placa_secundaria',

        // Puntos
        'punto_partida_ubigeo',
        'punto_partida_direccion',
        'punto_llegada_ubigeo',
        'punto_llegada_direccion',

        // Otros (opcionales)
        'observaciones',
        'estado_logistico',

        // SUNAT
        'estado',
        'xml_firmado',
        'xml_respuesta_sunat',
        'mensaje_sunat',
        'errores_sunat',
        'codigo_hash',
        'tiene_xml',
        'tiene_pdf',
        'tiene_cdr',
        'fecha_aceptacion',
        'nota_sunat',
        'pdf_base64',
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_inicio_traslado' => 'date',
        'fecha_aceptacion' => 'datetime',
        'peso_total' => 'decimal:2',
        'numero_bultos' => 'integer',
        'requiere_sunat' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function detalles()
    {
        return $this->hasMany(GuiaRemisionDetalle::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Accessors
    public function getNumeroCompletoAttribute()
    {
        return $this->serie.'-'.str_pad($this->correlativo, 8, '0', STR_PAD_LEFT);
    }

    public function getTipoComprobanteNombreAttribute()
    {
        return 'Guía de Remisión';
    }

    public function getEstadoNombreAttribute()
    {
        $estados = [
            self::ESTADO_PENDIENTE => 'Pendiente',
            self::ESTADO_ACEPTADO => 'Aceptado',
            self::ESTADO_RECHAZADO => 'Rechazado',
            self::ESTADO_ANULADO => 'Anulado',
        ];

        return $estados[$this->estado] ?? 'Desconocido';
    }

    /**
     * Obtener todos los estados disponibles
     */
    public static function getEstados()
    {
        return [
            self::ESTADO_PENDIENTE,
            self::ESTADO_ACEPTADO,
            self::ESTADO_RECHAZADO,
            self::ESTADO_ANULADO,
        ];
    }

    /**
     * Obtener estados con sus nombres
     */
    public static function getEstadosConNombres()
    {
        return [
            self::ESTADO_PENDIENTE => 'Pendiente',
            self::ESTADO_ACEPTADO => 'Aceptado',
            self::ESTADO_RECHAZADO => 'Rechazado',
            self::ESTADO_ANULADO => 'Anulado',
        ];
    }

    /**
     * Obtener el número completo del comprobante relacionado
     */
    public function getComprobanteRelacionadoAttribute()
    {
        if ($this->comprobante_serie && $this->comprobante_numero) {
            return $this->comprobante_serie.'-'.$this->comprobante_numero;
        }

        return null;
    }

    /**
     * Obtener el texto de la nota para SUNAT (FT: F001-2950)
     */
    public function getNotaSunatAttribute()
    {
        if ($this->comprobante_serie && $this->comprobante_numero) {
            $prefijo = $this->comprobante_tipo == '01' ? 'FT' : 'BV';

            return "{$prefijo}: {$this->comprobante_serie}-{$this->comprobante_numero}";
        }

        return null;
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->whereIn('estado', [
            self::ESTADO_PENDIENTE,
            self::ESTADO_ACEPTADO
        ]);
    }

    public function scopePorEstado($query, $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopePorFecha($query, $fechaInicio, $fechaFin = null)
    {
        $query->whereDate('fecha_emision', '>=', $fechaInicio);

        if ($fechaFin) {
            $query->whereDate('fecha_emision', '<=', $fechaFin);
        }

        return $query;
    }

    // Métodos de utilidad
    public function puedeEnviar()
    {
        return $this->estado === self::ESTADO_PENDIENTE;
    }

    public function puedeReenviar()
    {
        return in_array($this->estado, [
            self::ESTADO_RECHAZADO,
            self::ESTADO_PENDIENTE
        ]);
    }

    public function puedeAnular()
    {
        return in_array($this->estado, [
            self::ESTADO_PENDIENTE,
            self::ESTADO_ACEPTADO
        ]);
    }

    /**
     * Verificar si la guía fue aceptada por SUNAT
     */
    public function estaAceptada()
    {
        return $this->estado === self::ESTADO_ACEPTADO;
    }

    /**
     * Verificar si la guía fue rechazada por SUNAT
     */
    public function estaRechazada()
    {
        return $this->estado === self::ESTADO_RECHAZADO;
    }

    /**
     * Verificar si la guía está anulada
     */
    public function estaAnulada()
    {
        return $this->estado === self::ESTADO_ANULADO;
    }

    public function tieneArchivos()
    {
        return ! empty($this->xml_firmado) || ! empty($this->xml_respuesta_sunat);
    }

    // Métodos estáticos
    public static function tiposComprobante()
    {
        return [
            '09' => 'Guía de Remisión Remitente',
            '31' => 'Guía de Remisión Transportista',
        ];
    }

    public static function tiposGuia()
    {
        return [
            [
                'codigo' => 'REMITENTE',
                'nombre' => 'GRE Remitente',
                'tipo_comprobante' => '09',
                'requiere_sunat' => true,
                'descripcion' => 'Guías de remisión para ventas (transporte propio o contratado)',
            ],
            [
                'codigo' => 'INTERNO',
                'nombre' => 'Traslado Interno',
                'tipo_comprobante' => '09',
                'requiere_sunat' => false,
                'descripcion' => 'Traslados entre almacenes de la misma empresa (no requiere SUNAT)',
            ],
        ];
    }

    public static function motivosTraslado()
    {
        return [
            '01' => 'Venta',
            '02' => 'Compra',
            '04' => 'Traslado entre establecimientos de la misma empresa',
            '08' => 'Importación',
            '09' => 'Exportación',
            '13' => 'Otros',
        ];
    }

    public static function modalidadesTraslado()
    {
        return [
            '01' => 'Transporte público',
            '02' => 'Transporte privado',
        ];
    }

    public static function modosTransporte()
    {
        return [
            '01' => 'Transporte terrestre',
            '02' => 'Transporte fluvial',
            '03' => 'Transporte aéreo',
            '04' => 'Transporte marítimo',
        ];
    }

    /**
     * Validar si la guía requiere datos de transportista
     */
    public function requiereDatosTransportista()
    {
        return $this->tipo_guia === 'TRANSPORTISTA' || $this->modalidad_traslado === '02';
    }

    /**
     * Validar si la guía es de traslado interno (no requiere SUNAT)
     */
    public function esTrasladoInterno()
    {
        return $this->tipo_guia === 'INTERNO';
    }
}
