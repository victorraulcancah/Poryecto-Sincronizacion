<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComprobanteDetalle extends Model
{
    use HasFactory;

    protected $fillable = [
        'comprobante_id',
        'item',
        'producto_id',
        'codigo_producto',
        'descripcion',
        'unidad_medida',
        'cantidad',
        'valor_unitario',
        'precio_unitario',
        'descuento',
        'valor_venta',
        'porcentaje_igv',
        'igv',
        'tipo_afectacion_igv',
        'importe_total'
    ];

    protected $casts = [
        'item' => 'integer',
        'cantidad' => 'decimal:4',
        'valor_unitario' => 'decimal:4',
        'precio_unitario' => 'decimal:4',
        'descuento' => 'decimal:2',
        'valor_venta' => 'decimal:2',
        'porcentaje_igv' => 'decimal:2',
        'igv' => 'decimal:2',
        'importe_total' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class);
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Accessors
    public function getTipoAfectacionNombreAttribute()
    {
        $tipos = [
            '10' => 'Gravado - Operación Onerosa',
            '11' => 'Gravado - Retiro por premio',
            '12' => 'Gravado - Retiro por donación',
            '13' => 'Gravado - Retiro',
            '14' => 'Gravado - Retiro por publicidad',
            '15' => 'Gravado - Bonificaciones',
            '16' => 'Gravado - Retiro por entrega a trabajadores',
            '17' => 'Gravado - IVAP',
            '20' => 'Exonerado - Operación Onerosa',
            '21' => 'Exonerado - Transferencia Gratuita',
            '30' => 'Inafecto - Operación Onerosa',
            '31' => 'Inafecto - Retiro por Bonificación',
            '32' => 'Inafecto - Retiro',
            '33' => 'Inafecto - Retiro por Muestras Médicas',
            '34' => 'Inafecto - Retiro por Convenio Colectivo',
            '35' => 'Inafecto - Retiro por premio',
            '36' => 'Inafecto - Retiro por publicidad',
            '40' => 'Exportación'
        ];

        return $tipos[$this->tipo_afectacion_igv] ?? 'Desconocido';
    }

    // Métodos estáticos
    public static function unidadesMedida()
    {
        return [
            'NIU' => 'Unidad',
            'KGM' => 'Kilogramo',
            'LTR' => 'Litro',
            'MTR' => 'Metro',
            'BOX' => 'Caja',
            'PCE' => 'Pieza',
            'SET' => 'Conjunto',
            'ZZ' => 'Unidad (Otros)'
        ];
    }

    public static function tiposAfectacionIgv()
    {
        return [
            '10' => 'Gravado - Operación Onerosa',
            '20' => 'Exonerado - Operación Onerosa', 
            '30' => 'Inafecto - Operación Onerosa'
        ];
    }
}