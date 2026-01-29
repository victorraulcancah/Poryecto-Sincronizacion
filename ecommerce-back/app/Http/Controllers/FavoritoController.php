<?php

namespace App\Http\Controllers;

use App\Models\Favorito;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FavoritoController extends Controller
{
    /**
     * Obtener todos los favoritos del usuario autenticado
     */
    public function index()
    {
        try {
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            Log::info('Obteniendo favoritos para user_cliente_id: ' . $user->id);

            $favoritos = Favorito::where('user_cliente_id', $user->id)
                ->with(['producto' => function($query) {
                    $query->select('id', 'nombre', 'codigo_producto', 'precio_venta', 'precio_compra', 'imagen', 'stock', 'activo')
                          ->where('activo', 1);
                }])
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Favoritos encontrados: ' . $favoritos->count());

            // Agregar URL completa de la imagen
            $favoritos->each(function($favorito) {
                if ($favorito->producto && $favorito->producto->imagen) {
                    $favorito->producto->imagen_url = url('storage/productos/' . $favorito->producto->imagen);
                }
            });

            return response()->json([
                'success' => true,
                'data' => $favoritos
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener favoritos: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener favoritos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Agregar un producto a favoritos
     */
    public function store(Request $request)
    {
        try {
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            Log::info('Agregando favorito - User: ' . $user->id . ', Producto: ' . $request->producto_id);

            $request->validate([
                'producto_id' => 'required|exists:productos,id'
            ]);

            // Verificar si ya existe
            $existente = Favorito::where('user_cliente_id', $user->id)
                ->where('producto_id', $request->producto_id)
                ->first();

            if ($existente) {
                return response()->json([
                    'success' => false,
                    'message' => 'El producto ya está en favoritos'
                ], 400);
            }

            $favorito = Favorito::create([
                'user_cliente_id' => $user->id,
                'producto_id' => $request->producto_id
            ]);

            Log::info('Favorito creado exitosamente: ' . $favorito->id);

            return response()->json([
                'success' => true,
                'message' => 'Producto agregado a favoritos',
                'data' => $favorito
            ]);

        } catch (\Exception $e) {
            Log::error('Error al agregar favorito: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar favorito',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un producto de favoritos
     */
    public function destroy($productoId)
    {
        try {
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            $favorito = Favorito::where('user_cliente_id', $user->id)
                ->where('producto_id', $productoId)
                ->first();

            if (!$favorito) {
                return response()->json([
                    'success' => false,
                    'message' => 'Favorito no encontrado'
                ], 404);
            }

            $favorito->delete();

            return response()->json([
                'success' => true,
                'message' => 'Producto eliminado de favoritos'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al eliminar favorito: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar favorito'
            ], 500);
        }
    }
}
