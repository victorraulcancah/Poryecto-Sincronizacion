<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;


class ReniecController extends Controller
{
    public function buscar($doc)
    {
        $token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InN5c3RlbWNyYWZ0LnBlQGdtYWlsLmNvbSJ9.yuNS5hRaC0hCwymX_PjXRoSZJWLNNBeOdlLRSUGlHGA';

        if (strlen($doc) == 8) {
            $url = 'https://dniruc.apisperu.com/api/v1/dni/' . $doc . '?token=' . $token;
        } else {
            $url = 'https://dniruc.apisperu.com/api/v1/ruc/' . $doc . '?token=' . $token;
        }

        // SOLUCIÓN: Desactiva verificación SSL solo en desarrollo
        $response = Http::withoutVerifying()->get($url);

        if ($response->successful()) {

            $data = $response->json();
            
            if (strlen($doc) == 8) {
                $data["nombre"] = $data["nombres"] . " " . $data["apellidoPaterno"] . " " . $data["apellidoMaterno"];
            } else {
                $data["nombre"] = $data["razonSocial"];
            }
            
            return response()->json($data);
        } else {
            return response()->json([
                'message' => 'No se pudo obtener la información del documento',
                'status' => $response->status()
            ], $response->status());
        }
    }
}