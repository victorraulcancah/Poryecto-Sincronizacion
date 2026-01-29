<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogoSunat extends Model
{
    use HasFactory;

    protected $table = 'catalogos_sunat';

    protected $fillable = [
        'catalogo',
        'codigo',
        'descripcion',
        'descripcion_corta',
        'metadatos',
        'activo'
    ];

    protected $casts = [
        'metadatos' => 'array',
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopePorCatalogo($query, $catalogo)
    {
        return $query->where('catalogo', $catalogo);
    }

    public function scopeBuscar($query, $termino)
    {
        return $query->where(function($q) use ($termino) {
            $q->where('descripcion', 'LIKE', '%' . $termino . '%')
              ->orWhere('codigo', 'LIKE', '%' . $termino . '%')
              ->orWhere('descripcion_corta', 'LIKE', '%' . $termino . '%');
        });
    }

    // Métodos estáticos para catálogos específicos
    public static function tiposDocumentoIdentidad()
    {
        return self::porCatalogo('tipo_documento_identidad')->activos()->get();
    }

    public static function tiposAfectacionIgv()
    {
        return self::porCatalogo('tipo_afectacion_igv')->activos()->get();
    }

    public static function unidadesMedida()
    {
        return self::porCatalogo('unidad_medida')->activos()->get();
    }

    public static function motivosNotaCredito()
    {
        return self::porCatalogo('motivo_nota_credito')->activos()->get();
    }

    public static function motivosNotaDebito()
    {
        return self::porCatalogo('motivo_nota_debito')->activos()->get();
    }

    public static function tiposComprobante()
    {
        return self::porCatalogo('tipo_comprobante')->activos()->get();
    }

    public static function monedas()
    {
        return self::porCatalogo('monedas')->activos()->get();
    }

    // Métodos de utilidad
    public function getDescripcionCompletaAttribute()
    {
        return $this->codigo . ' - ' . $this->descripcion;
    }

    public function esActivo()
    {
        return $this->activo;
    }

    // Método para obtener un item específico
    public static function obtenerItem($catalogo, $codigo)
    {
        return self::porCatalogo($catalogo)
            ->where('codigo', $codigo)
            ->activos()
            ->first();
    }

    // Método para validar si un código existe en un catálogo
    public static function validarCodigo($catalogo, $codigo)
    {
        return self::porCatalogo($catalogo)
            ->where('codigo', $codigo)
            ->activos()
            ->exists();
    }
}
