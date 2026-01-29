<?php

namespace App\Http\Controllers\Facturacion;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class CertificadosController extends BaseController
{
    public function index()
    {
        return response()->json(['data' => []]);
    }

    public function show($id)
    {
        return response()->json(['id' => (int) $id]);
    }

    public function store(Request $request)
    {
        return response()->json(['message' => 'Certificado registrado'], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'Certificado actualizado']);
    }

    public function destroy($id)
    {
        return response()->json(['message' => 'Certificado eliminado']);
    }

    public function activar($id)
    {
        return response()->json(['message' => 'Certificado activado']);
    }

    public function validar($id)
    {
        return response()->json(['id' => (int) $id, 'valido' => true]);
    }
}


