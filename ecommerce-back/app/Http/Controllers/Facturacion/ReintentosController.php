<?php

namespace App\Http\Controllers\Facturacion;

use Illuminate\Routing\Controller as BaseController;

class ReintentosController extends BaseController
{
    public function index() { return response()->json(['data' => []]); }
    public function reintentar($id) { return response()->json(['id' => (int)$id, 'status' => 'queued']); }
    public function reintentarTodo() { return response()->json(['status' => 'queued_all']); }
    public function cancelar($id) { return response()->json(['id' => (int)$id, 'status' => 'cancelled']); }
}


