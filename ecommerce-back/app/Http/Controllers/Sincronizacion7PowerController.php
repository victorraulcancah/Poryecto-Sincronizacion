<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\MarcaProducto;
use App\Models\Producto;
use App\Models\ProductoMapeo7Power;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Sincronizacion7PowerController extends Controller
{
    /**
     * Sincronizar productos desde 7Power a Magus
     * Este endpoint consume la API de 7Power y guarda los productos en las tablas intermedias
     */
    public function sincronizarProductos(Request $request)
    {
        try {
            // URL del backend de 7Power
            $apiUrl7Power = env('API_URL_7POWER', 'http://127.0.0.1:8001/api');
            
            Log::info('🔄 Iniciando sincronización de productos desde 7Power');
            
            // Obtener productos desde 7Power
            $response = Http::withHeaders([
                'Origin' => env('APP_URL', 'http://localhost:4200')
            ])->get("{$apiUrl7Power}/productos-publicos", [
                'per_page' => 1000 // Obtener todos los productos
            ]);

            if (!$response->successful()) {
                Log::error('❌ Error al obtener productos de 7Power', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Error al conectar con 7Power'
                ], 500);
            }

            $data = $response->json();
            $productos7Power = $data['data'] ?? [];
            
            Log::info("📦 Productos obtenidos de 7Power: " . count($productos7Power));

            $stats = [
                'total' => count($productos7Power),
                'creados' => 0,
                'actualizados' => 0,
                'errores' => 0,
                'categorias_creadas' => 0,
                'marcas_creadas' => 0
            ];

            DB::beginTransaction();

            foreach ($productos7Power as $producto7Power) {
                try {
                    // 1. Sincronizar categoría
                    $categoriaId = $this->sincronizarCategoria($producto7Power['categoria']);
                    if ($categoriaId) {
                        $stats['categorias_creadas']++;
                    }

                    // 2. Sincronizar marca
                    $marcaId = $this->sincronizarMarca($producto7Power['marca']);
                    if ($marcaId) {
                        $stats['marcas_creadas']++;
                    }

                    // 3. Verificar si el producto ya existe en el mapeo
                    $mapeo = ProductoMapeo7Power::where('producto_7power_id', $producto7Power['id'])->first();

                    if ($mapeo) {
                        // Actualizar producto existente
                        $producto = Producto::find($mapeo->producto_id);
                        if ($producto) {
                            $producto->update([
                                'nombre' => $producto7Power['nombre'],
                                'descripcion' => $producto7Power['descripcion'],
                                'codigo_producto' => $producto7Power['codigo'],
                                'categoria_id' => $categoriaId,
                                'marca_id' => $marcaId,
                                'precio_compra' => $producto7Power['precio_compra'] ?? 0,
                                'precio_venta' => $producto7Power['precio_venta'] ?? 0,
                                'stock' => $producto7Power['stock'] ?? 0,
                                'activo' => $producto7Power['estado'] ?? true,
                            ]);
                            $stats['actualizados']++;
                            Log::info("✅ Producto actualizado: {$producto->nombre}");
                        }
                    } else {
                        // Crear nuevo producto
                        $producto = Producto::create([
                            'nombre' => $producto7Power['nombre'],
                            'descripcion' => $producto7Power['descripcion'],
                            'codigo_producto' => $producto7Power['codigo'],
                            'categoria_id' => $categoriaId,
                            'marca_id' => $marcaId,
                            'precio_compra' => $producto7Power['precio_compra'] ?? 0,
                            'precio_venta' => $producto7Power['precio_venta'] ?? 0,
                            'stock' => $producto7Power['stock'] ?? 0,
                            'stock_minimo' => 5,
                            'activo' => $producto7Power['estado'] ?? true,
                            'destacado' => false,
                            'mostrar_igv' => true,
                        ]);

                        // Crear mapeo
                        ProductoMapeo7Power::create([
                            'producto_id' => $producto->id,
                            'producto_7power_id' => $producto7Power['id']
                        ]);

                        $stats['creados']++;
                        Log::info("✅ Producto creado: {$producto->nombre}");
                    }

                } catch (\Exception $e) {
                    $stats['errores']++;
                    Log::error("❌ Error al sincronizar producto: {$producto7Power['nombre']}", [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            DB::commit();

            Log::info('✅ Sincronización completada', $stats);

            return response()->json([
                'success' => true,
                'message' => 'Sincronización completada exitosamente',
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error en sincronización', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error en la sincronización: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sincronizar categoría desde 7Power
     */
    private function sincronizarCategoria($categoria7Power)
    {
        if (!$categoria7Power || !isset($categoria7Power['id'])) {
            return null;
        }

        // Buscar por código externo (ID de 7Power)
        $categoria = Categoria::where('codigo_externo', $categoria7Power['id'])->first();

        if (!$categoria) {
            // Crear nueva categoría
            $categoria = Categoria::create([
                'codigo_externo' => $categoria7Power['id'],
                'nombre' => $categoria7Power['nombre'],
                'activo' => true,
                'id_seccion' => 1 // Sección por defecto
            ]);
            Log::info("✅ Categoría creada: {$categoria->nombre}");
            return true; // Indica que se creó
        }

        return false; // Ya existía
    }

    /**
     * Sincronizar marca desde 7Power
     */
    private function sincronizarMarca($marca7Power)
    {
        if (!$marca7Power || !isset($marca7Power['id'])) {
            return null;
        }

        // Buscar por código externo (ID de 7Power)
        $marca = MarcaProducto::where('codigo_externo', $marca7Power['id'])->first();

        if (!$marca) {
            // Crear nueva marca
            $marca = MarcaProducto::create([
                'codigo_externo' => $marca7Power['id'],
                'nombre' => $marca7Power['nombre'],
                'activo' => true
            ]);
            Log::info("✅ Marca creada: {$marca->nombre}");
            return true; // Indica que se creó
        }

        return false; // Ya existía
    }

    /**
     * Obtener estadísticas de sincronización
     */
    public function estadisticasSincronizacion()
    {
        $totalProductos = Producto::count();
        $totalMapeados = ProductoMapeo7Power::count();
        $totalCategorias = Categoria::whereNotNull('codigo_externo')->count();
        $totalMarcas = MarcaProducto::whereNotNull('codigo_externo')->count();

        return response()->json([
            'total_productos' => $totalProductos,
            'productos_mapeados' => $totalMapeados,
            'categorias_sincronizadas' => $totalCategorias,
            'marcas_sincronizadas' => $totalMarcas,
            'porcentaje_sincronizacion' => $totalProductos > 0 
                ? round(($totalMapeados / $totalProductos) * 100, 2) 
                : 0
        ]);
    }
}
