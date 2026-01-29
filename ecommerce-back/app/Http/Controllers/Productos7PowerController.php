<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Productos7PowerController extends Controller
{
    private $apiUrl7Power;
    private $companyId;

    public function __construct()
    {
        $this->apiUrl7Power = env('API_7POWER_URL', 'http://127.0.0.1:8001/api');
        $this->companyId = env('COMPANY_7POWER_ID', 1);
    }

    /**
     * Actualizar producto en 7power (proxy con autenticación)
     */
    public function update(Request $request, $id)
    {
        try {
            // Preparar datos para enviar a 7power
            $data = [];
            
            // Campos de texto
            if ($request->has('name')) {
                $data['name'] = $request->input('name');
            }
            if ($request->has('descripcion')) {
                $data['descripcion'] = $request->input('descripcion');
            }
            if ($request->has('codigo')) {
                $data['codigo'] = $request->input('codigo');
            }
            if ($request->has('sku')) {
                $data['sku'] = $request->input('sku');
            }
            if ($request->has('cod_barra')) {
                $data['cod_barra'] = $request->input('cod_barra');
            }
            if ($request->has('category_id')) {
                $data['category_id'] = $request->input('category_id');
            }
            if ($request->has('brand_id')) {
                $data['brand_id'] = $request->input('brand_id');
            }
            if ($request->has('estado')) {
                $data['estado'] = $request->input('estado');
            }

            // Manejar imagen si existe
            if ($request->hasFile('img')) {
                $image = $request->file('img');
                
                // Crear multipart request
                $response = Http::withHeaders([
                    'X-Company-Id' => $this->companyId,
                    'Accept' => 'application/json',
                ])
                ->attach('img', file_get_contents($image->getRealPath()), $image->getClientOriginalName())
                ->post("{$this->apiUrl7Power}/productos/{$id}", $data);
            } else {
                // Request normal sin imagen
                $response = Http::withHeaders([
                    'X-Company-Id' => $this->companyId,
                    'Accept' => 'application/json',
                ])
                ->post("{$this->apiUrl7Power}/productos/{$id}", $data);
            }

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Producto actualizado correctamente',
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar producto en 7power',
                'error' => $response->body()
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error al actualizar producto en 7power: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar producto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Subir solo imagen de producto
     */
    public function uploadImage(Request $request, $id)
    {
        try {
            if (!$request->hasFile('imagen')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se recibió ninguna imagen'
                ], 400);
            }

            $image = $request->file('imagen');

            // Enviar imagen a 7power
            $response = Http::withHeaders([
                'X-Company-Id' => $this->companyId,
                'Accept' => 'application/json',
            ])
            ->attach('img', file_get_contents($image->getRealPath()), $image->getClientOriginalName())
            ->post("{$this->apiUrl7Power}/productos/{$id}", [
                '_method' => 'PUT'
            ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Imagen actualizada correctamente',
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al subir imagen a 7power',
                'error' => $response->body()
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error al subir imagen a 7power: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al subir imagen',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
