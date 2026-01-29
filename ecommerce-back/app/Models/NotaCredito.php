<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotaCredito extends Model
{
    use HasFactory;

    protected $fillable = [
        'serie',
        'numero',
        'serie_comprobante_ref',
        'numero_comprobante_ref',
        'tipo_comprobante_ref',
        'venta_id',
        'cliente_id',
        'fecha_emision',
        'motivo',
        'tipo_nota_credito',
        'subtotal',
        'igv',
        'total',
        'moneda',
        'estado',
        'xml',
        'cdr',
        'pdf',
        'hash',
        'mensaje_sunat',
        'codigo_error_sunat',
        'fecha_envio_sunat',
        'observaciones'
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'hora_emision' => 'datetime',
        'subtotal' => 'decimal:2',
        'total_igv' => 'decimal:2',
        'total' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function venta()
    {
        return $this->belongsTo(\App\Models\Venta::class);
    }

    public function cliente()
    {
        return $this->belongsTo(\App\Models\Cliente::class);
    }

    // Scopes
    public function scopePendientes($query)
    {
        return $query->where('estado', 'PENDIENTE');
    }

    public function scopeEnviadas($query)
    {
        return $query->where('estado', 'ENVIADO');
    }

    public function scopeAceptadas($query)
    {
        return $query->where('estado', 'ACEPTADO');
    }

    // Accessors
    public function getTipoNotaCreditoNombreAttribute()
    {
        $tipos = [
            '07' => 'Nota de Crédito'
        ];

        return $tipos[$this->tipo_nota_credito] ?? 'Desconocido';
    }

    public function getPdfUrlAttribute()
    {
        $numeroCompleto = $this->serie . '-' . $this->numero;
        return url("/api/nota-credito/pdf/{$this->id}/{$numeroCompleto}");
    }

    public function getXmlUrlAttribute()
    {
        $numeroCompleto = $this->serie . '-' . $this->numero;
        return url("/api/nota-credito/xml/{$this->id}/{$numeroCompleto}");
    }

    public function getCdrUrlAttribute()
    {
        if ($this->cdr) {
            $numeroCompleto = $this->serie . '-' . $this->numero;
            return url("/api/nota-credito/cdr/{$this->id}/{$numeroCompleto}");
        }
        return null;
    }

    // Agregar estos atributos al JSON
    protected $appends = ['pdf_url', 'xml_url', 'cdr_url', 'tipo_nota_credito_nombre'];
}
