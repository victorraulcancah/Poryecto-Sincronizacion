<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfiguracionTributaria extends Model
{
    use HasFactory;

    protected $table = 'configuracion_tributaria';

    protected $fillable = [
        'ambiente',
        'ruc',
        'razon_social',
        'nombre_comercial',
        'direccion',
        'ubigeo',
        'departamento',
        'provincia',
        'distrito',
        'sol_usuario',
        'sol_clave',
        'certificado_path',
        'certificado_clave',
        'endpoint_factura',
        'endpoint_guia',
        'endpoint_retension',
        'igv_porcentaje',
        'moneda_defecto',
        'logo_empresa',
        'observaciones'
    ];

    protected $hidden = [
        'sol_clave',
        'certificado_clave'
    ];

    protected $casts = [
        'igv_porcentaje' => 'decimal:2'
    ];

    /**
     * Obtener la configuración actual (singleton)
     */
    public static function obtenerConfiguracion()
    {
        return self::first() ?? self::create([
            'ambiente' => 'beta',
            'igv_porcentaje' => 18.00,
            'moneda_defecto' => 'PEN'
        ]);
    }

    /**
     * Verificar si está en producción
     */
    public function esProduccion()
    {
        return $this->ambiente === 'produccion';
    }

    /**
     * Verificar si está en beta/pruebas
     */
    public function esBeta()
    {
        return $this->ambiente === 'beta';
    }
}
