<?php

namespace App\Services;

use App\Models\UserCliente;
use Illuminate\Support\Facades\Http;

/**
 * Consulta el crédito disponible de un cliente en el ERP 7Power (endpoint
 * público /ecommerce/clientes/credito) y lo cachea localmente en
 * user_clientes, ya que el ERP no conoce los pedidos del e-commerce.
 */
class ErpCreditoService
{
    /**
     * Consulta el ERP y actualiza credito_disponible/credito_actualizado_at
     * del cliente. Devuelve el valor sincronizado, o null si la consulta falló
     * o el cliente no tiene codigo_erp / no existe en el ERP.
     */
    public function sincronizar(UserCliente $cliente): ?float
    {
        if (!$cliente->codigo_erp) {
            return null;
        }

        try {
            $respuesta = Http::timeout(5)->get(
                rtrim(env('API_7POWER_URL', 'http://127.0.0.1:8001/api'), '/')
                    . '/ecommerce/clientes/credito',
                ['codigo' => $cliente->codigo_erp]
            );
        } catch (\Exception $e) {
            return null;
        }

        if (!$respuesta->ok() || $respuesta->json('existe') !== true) {
            return null;
        }

        $creditoDisponible = (float) $respuesta->json('credito_disponible', 0);

        $cliente->update([
            'credito_disponible' => $creditoDisponible,
            'credito_actualizado_at' => now(),
        ]);

        return $creditoDisponible;
    }
}
