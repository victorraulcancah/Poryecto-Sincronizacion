<?php
// app/Http/Controllers/EmpresaInfoController.php

namespace App\Http\Controllers;

use App\Models\EmpresaInfo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaInfoController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $empresaInfo = EmpresaInfo::first();
            
            if (!$empresaInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró información de la empresa'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $empresaInfo
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener información de la empresa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nombre_empresa' => 'required|string|max:255',
                'ruc' => 'required|string|size:11|unique:empresa_info,ruc',
                'razon_social' => 'required|string|max:255',
                'direccion' => 'required|string',
                'telefono' => 'nullable|string|max:20',
                'celular' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'descripcion' => 'nullable|string',
                'facebook' => 'nullable|string|max:255',
                'instagram' => 'nullable|string|max:255',
                'twitter' => 'nullable|string|max:255',
                'youtube' => 'nullable|string|max:255',
                'whatsapp' => 'nullable|string|max:20',
                'horario_atencion' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->except(['logo']);

            // Procesar logo si existe
            if ($request->hasFile('logo')) {
                $logoPath = $request->file('logo')->store('empresa/logos', 'public');
                $data['logo'] = $logoPath;
            }

            $empresaInfo = EmpresaInfo::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Información de empresa creada exitosamente',
                'data' => $empresaInfo
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear información de empresa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $empresaInfo = EmpresaInfo::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'nombre_empresa' => 'required|string|max:255',
                'ruc' => 'required|string|size:11|unique:empresa_info,ruc,' . $id,
                'razon_social' => 'required|string|max:255',
                'direccion' => 'required|string',
                'telefono' => 'nullable|string|max:20',
                'celular' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'descripcion' => 'nullable|string',
                'facebook' => 'nullable|string|max:255',
                'instagram' => 'nullable|string|max:255',
                'twitter' => 'nullable|string|max:255',
                'youtube' => 'nullable|string|max:255',
                'whatsapp' => 'nullable|string|max:20',
                'horario_atencion' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->except(['logo']);

            // Procesar nuevo logo si existe
            if ($request->hasFile('logo')) {
                // Eliminar logo anterior si existe
                if ($empresaInfo->logo && Storage::disk('public')->exists($empresaInfo->logo)) {
                    Storage::disk('public')->delete($empresaInfo->logo);
                }
                
                $logoPath = $request->file('logo')->store('empresa/logos', 'public');
                $data['logo'] = $logoPath;
            }

            $empresaInfo->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Información de empresa actualizada exitosamente',
                'data' => $empresaInfo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar información de empresa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $empresaInfo = EmpresaInfo::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $empresaInfo
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Información de empresa no encontrada'
            ], 404);
        }
    }
     public function obtenerInfoPublica(): JsonResponse
{
    try {
        $empresaInfo = EmpresaInfo::first();
        
        if (!$empresaInfo) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró información de la empresa'
            ], 404);
        }

        // Usar el método getAttribute o verificar si existe la propiedad
        $infoPublica = [
            'nombre_empresa' => $empresaInfo->getAttribute('nombre_empresa'),
            'telefono' => $empresaInfo->getAttribute('telefono'),
            'celular' => $empresaInfo->getAttribute('celular'),
            'email' => $empresaInfo->getAttribute('email'),
            'direccion' => $empresaInfo->getAttribute('direccion'),
            'website' => $empresaInfo->getAttribute('website'),
            'facebook' => $empresaInfo->getAttribute('facebook'),
            'instagram' => $empresaInfo->getAttribute('instagram'),
            'twitter' => $empresaInfo->getAttribute('twitter'),
            'youtube' => $empresaInfo->getAttribute('youtube'),
            'whatsapp' => $empresaInfo->getAttribute('whatsapp'),
            'horario_atencion' => $empresaInfo->getAttribute('horario_atencion'),
            'logo_url' => $empresaInfo->logo 
                ? url('storage/' . $empresaInfo->logo)
                : null
        ];

        return response()->json([
            'success' => true,
            'data' => $infoPublica
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error al obtener información de la empresa',
            'error' => $e->getMessage()
        ], 500);
    }
}

}
