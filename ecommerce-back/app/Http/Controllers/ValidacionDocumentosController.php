<?php

namespace App\Http\Controllers;

use App\Services\ValidacionDocumentosService;
use Illuminate\Http\Request;

class ValidacionDocumentosController extends Controller
{
    protected $validacionService;

    public function __construct(ValidacionDocumentosService $validacionService)
    {
        $this->validacionService = $validacionService;
    }

    /**
     * Validar RUC
     */
    public function validarRuc(Request $request)
    {
        $request->validate([
            'ruc' => 'required|string|size:11'
        ]);

        $resultado = $this->validacionService->validarRuc($request->ruc);

        if ($resultado['success']) {
            return response()->json($resultado);
        } else {
            return response()->json($resultado, 404);
        }
    }

    /**
     * Validar DNI
     */
    public function validarDni(Request $request)
    {
        $request->validate([
            'dni' => 'required|string|size:8'
        ]);

        $resultado = $this->validacionService->validarDni($request->dni);

        if ($resultado['success']) {
            return response()->json($resultado);
        } else {
            return response()->json($resultado, 404);
        }
    }

    /**
     * Validar documento (detecta automáticamente si es RUC o DNI)
     */
    public function validarDocumento(Request $request)
    {
        $request->validate([
            'documento' => 'required|string'
        ]);

        $resultado = $this->validacionService->validarDocumento($request->documento);

        if ($resultado['success']) {
            return response()->json($resultado);
        } else {
            return response()->json($resultado, 404);
        }
    }

    /**
     * Validar múltiples documentos en lote
     */
    public function validarLote(Request $request)
    {
        $request->validate([
            'documentos' => 'required|array',
            'documentos.*.tipo' => 'nullable|in:ruc,dni,auto',
            'documentos.*.numero' => 'required|string'
        ]);

        $resultados = $this->validacionService->validarLote($request->documentos);

        return response()->json([
            'success' => true,
            'resultados' => $resultados
        ]);
    }

    /**
     * Limpiar caché de un documento
     */
    public function limpiarCache(Request $request)
    {
        $request->validate([
            'tipo' => 'required|in:ruc,dni',
            'numero' => 'required|string'
        ]);

        $this->validacionService->limpiarCache($request->tipo, $request->numero);

        return response()->json([
            'success' => true,
            'message' => 'Caché limpiado exitosamente'
        ]);
    }
}
