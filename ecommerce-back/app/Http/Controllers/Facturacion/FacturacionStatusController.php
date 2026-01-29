<?php

namespace App\Http\Controllers\Facturacion;

use Illuminate\Routing\Controller as BaseController;

class FacturacionStatusController extends BaseController
{
    public function status()
    {
        return response()->json([
            'certificado_activo' => true,
            'sunat_conexion' => 'ok',
            'cola_pendientes' => 0,
        ]);
    }
}


