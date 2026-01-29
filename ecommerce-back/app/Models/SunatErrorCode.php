<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SunatErrorCode extends Model
{
    protected $fillable = [
        'codigo',
        'descripcion',
        'categoria',
        'tipo',
        'activo',
        'solucion_sugerida'
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Buscar error por código
     */
    public static function buscarPorCodigo($codigo)
    {
        return self::where('codigo', $codigo)
                   ->where('activo', true)
                   ->first();
    }

    /**
     * Obtener errores por categoría
     */
    public static function obtenerPorCategoria($categoria)
    {
        return self::where('categoria', $categoria)
                   ->where('activo', true)
                   ->orderBy('codigo')
                   ->get();
    }

    /**
     * Obtener todos los códigos activos
     */
    public static function obtenerActivos()
    {
        return self::where('activo', true)
                   ->orderBy('codigo')
                   ->get();
    }

    /**
     * Parsear código de error desde respuesta SUNAT
     */
    public static function parsearCodigoError($mensajeError)
    {
        // Buscar patrones como "0100", "0101", etc.
        if (preg_match('/\b(\d{4})\b/', $mensajeError, $matches)) {
            return $matches[1];
        }
        
        // Buscar patrones como "soap:Server.0100"
        if (preg_match('/\.(\d{4})$/', $mensajeError, $matches)) {
            return $matches[1];
        }
        
        return null;
    }

    /**
     * Obtener información completa del error
     */
    public static function obtenerInformacionError($codigo)
    {
        $error = self::buscarPorCodigo($codigo);
        
        if (!$error) {
            return [
                'codigo' => $codigo,
                'descripcion' => 'Código de error no encontrado en el catálogo',
                'categoria' => 'desconocido',
                'tipo' => 'error',
                'solucion_sugerida' => 'Contactar al administrador del sistema'
            ];
        }
        
        return $error->toArray();
    }
}
