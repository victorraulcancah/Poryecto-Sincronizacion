<?php

namespace App\Http\Controllers\Facturacion;

use Illuminate\Routing\Controller as BaseController;

class ComprobantesArchivosController extends BaseController
{
    public function xml($id) { return response()->json(['id' => (int)$id, 'xml' => true]); }
    public function cdr($id) { return response()->json(['id' => (int)$id, 'cdr' => true]); }
    public function qr($id) { return response()->json(['id' => (int)$id, 'qr' => true]); }
}


