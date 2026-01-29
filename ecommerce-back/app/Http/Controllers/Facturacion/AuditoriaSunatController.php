<?php

namespace App\Http\Controllers\Facturacion;

use Illuminate\Routing\Controller as BaseController;

class AuditoriaSunatController extends BaseController
{
    public function index() { return response()->json(['data' => []]); }
    public function show($id) { return response()->json(['id' => (int)$id]); }
}


