<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Tipo de cambio comercial de la empresa, el mismo que usa Nueva Venta del ERP.
 *
 * Sale de la tabla `exchange_rates` de 7Power (interbancario de Bloomberg) más
 * el margen comercial, y se lee por la conexión `mysql_7power` sin modificar
 * nada del ERP.
 */
class TipoCambioController extends Controller
{
    /**
     * Margen que 7Power suma al interbancario para su TC comercial
     * (ExchangeRateService::MARGEN_COMERCIAL).
     */
    private const MARGEN_COMERCIAL = 0.025;

    public function comercial(): JsonResponse
    {
        $registro = DB::connection('mysql_7power')->table('exchange_rates')
            ->whereNotNull('interbancario')
            ->orderByDesc('fecha')
            ->first(['interbancario', 'interbancario_fuente', 'fecha', 'interbancario_actualizado_en']);

        if (!$registro) {
            // Sin dato disponible: el front se queda con su valor por defecto
            // en vez de mostrar un tipo de cambio en blanco.
            return response()->json(['disponible' => false], 200);
        }

        $valorFuente = (float) $registro->interbancario;

        return response()->json([
            'disponible' => true,
            'valor_fuente' => round($valorFuente, 4),
            'fuente' => $registro->interbancario_fuente,
            'fecha_fuente' => $registro->fecha,
            'margen' => self::MARGEN_COMERCIAL,
            'valor_final' => round($valorFuente + self::MARGEN_COMERCIAL, 3),
            'actualizado_en' => $registro->interbancario_actualizado_en,
        ]);
    }
}
