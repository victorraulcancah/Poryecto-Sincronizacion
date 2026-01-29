<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Comprobante extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo_comprobante',
        'serie',
        'correlativo',
        'fecha_emision',
        'fecha_vencimiento',
        'cliente_id',
        'cliente_tipo_documento',
        'cliente_numero_documento',
        'cliente_razon_social',
        'cliente_direccion',
        'moneda',
        'operacion_gravada',
        'operacion_exonerada',
        'operacion_inafecta',
        'operacion_gratuita',
        'total_igv',
        'total_descuentos',
        'total_otros_cargos',
        'importe_total',
        'observaciones',
        'comprobante_referencia_id',
        'tipo_nota',
        'motivo_nota',
        'estado',
        'origen',
        'compra_id',
        'metodo_pago',
        'referencia_pago',
        'codigo_hash',
        'xml_firmado',
        'xml_respuesta_sunat',
        'pdf_base64',
        'mensaje_sunat',
        'errores_sunat',
        'codigos_error_sunat',
        'informacion_errores',
        'user_id'
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_vencimiento' => 'date',
        'operacion_gravada' => 'decimal:2',
        'operacion_exonerada' => 'decimal:2',
        'operacion_inafecta' => 'decimal:2',
        'operacion_gratuita' => 'decimal:2',
        'total_igv' => 'decimal:2',
        'total_descuentos' => 'decimal:2',
        'total_otros_cargos' => 'decimal:2',
        'importe_total' => 'decimal:2',
        'codigos_error_sunat' => 'array',
        'informacion_errores' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected $appends = [
        'tiene_xml',
        'tiene_pdf',
        'tiene_cdr',
        'numero_completo',
        'tipo_documento',
        'estado_sunat',
        'documento_tipo'
    ];

    // Relaciones
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function detalles()
    {
        return $this->hasMany(ComprobanteDetalle::class);
    }

    public function comprobanteReferencia()
    {
        return $this->belongsTo(Comprobante::class, 'comprobante_referencia_id');
    }

    public function notasRelacionadas()
    {
        return $this->hasMany(Comprobante::class, 'comprobante_referencia_id');
    }

    public function venta()
    {
        return $this->hasOne(Venta::class);
    }

    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    // Scopes
    public function scopePorEstado($query, $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo_comprobante', $tipo);
    }

    public function scopePorFecha($query, $fecha_inicio, $fecha_fin = null)
    {
        if ($fecha_fin) {
            return $query->whereBetween('fecha_emision', [$fecha_inicio, $fecha_fin]);
        }
        return $query->whereDate('fecha_emision', $fecha_inicio);
    }

    // Accessors
    public function getTipoComprobanteNombreAttribute()
    {
        $tipos = [
            '01' => 'Factura',
            '03' => 'Boleta de Venta',
            '07' => 'Nota de Crédito',
            '08' => 'Nota de Débito'
        ];

        return $tipos[$this->tipo_comprobante] ?? 'Desconocido';
    }

    public function getEstadoColorAttribute()
    {
        $colores = [
            'PENDIENTE' => 'yellow',
            'ENVIADO' => 'blue',
            'ACEPTADO' => 'green', 
            'RECHAZADO' => 'red',
            'ANULADO' => 'gray'
        ];

        return $colores[$this->estado] ?? 'gray';
    }

    public function getEsNotaAttribute()
    {
        return in_array($this->tipo_comprobante, ['07', '08']);
    }

    public function getTieneXmlAttribute()
    {
        return !empty($this->xml_firmado);
    }

    public function getTienePdfAttribute()
    {
        return !empty($this->pdf_base64);
    }

    public function getTieneCdrAttribute()
    {
        return !empty($this->xml_respuesta_sunat);
    }

    public function getNumeroCompletoAttribute()
    {
        return $this->serie . '-' . str_pad($this->correlativo, 4, '0', STR_PAD_LEFT);
    }

    public function getTipoDocumentoAttribute()
    {
        return $this->tipo_comprobante;
    }

    public function getEstadoSunatAttribute()
    {
        // Si tiene CDR y estado es ACEPTADO
        if ($this->tiene_cdr && $this->estado === 'ACEPTADO') {
            return 'ACEPTADO';
        }

        // Si está pendiente o no se envió
        if (in_array($this->estado, ['PENDIENTE', 'BORRADOR'])) {
            return 'PENDIENTE';
        }

        // Si fue rechazado
        if ($this->estado === 'RECHAZADO') {
            return 'RECHAZADO';
        }

        return $this->estado ?? 'PENDIENTE';
    }

    public function getDocumentoTipoAttribute()
    {
        $tipos = [
            '01' => 'FT',  // Factura
            '03' => 'BI',  // Boleta
            '07' => 'NC',  // Nota Crédito
            '08' => 'ND',  // Nota Débito
            '09' => 'NV'   // Nota Venta
        ];
        return $tipos[$this->tipo_comprobante] ?? 'NV';
    }

    // Métodos de utilidad
    public function generarPdfBase64()
    {
        // Implementar generación de PDF usando Greenter Report
        // Este método se implementará en el servicio de Greenter
        return null;
    }

    public function puedeAnular()
    {
        return in_array($this->estado, ['ACEPTADO', 'ENVIADO']);
    }

    public function puedeReenviar()
    {
        return in_array($this->estado, ['PENDIENTE', 'RECHAZADO']);
    }
}