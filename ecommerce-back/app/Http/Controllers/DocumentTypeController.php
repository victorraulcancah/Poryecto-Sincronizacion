<?php
namespace App\Http\Controllers;

use App\Models\DocumentType;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    public function getDocumentTypes()
    {
        try {
            $documentTypes = DocumentType::select('id', 'nombre')->get();
            return response()->json($documentTypes);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al cargar tipos de documento'], 500);
        }
    }
}
