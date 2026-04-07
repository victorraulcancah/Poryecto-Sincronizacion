<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SincronizacionController extends Controller
{
    /**
     * Ejecutar sincronización manual desde 7Power
     */
    public function sincronizarDesde7Power(Request $request)
    {
        $companyId   = (int) $request->input('company_id', 1);
        $warehouseId = (int) $request->input('warehouse_id', 1);

        try {
            // Validar conexion a base de datos Novik/7Power
            try {
                DB::connection('mysql_7power')->getPdo();
                Log::info('Conexion a base de datos Novik/7Power exitosa');
            } catch (\Exception $e) {
                Log::error('Error de conexion a base de datos Novik/7Power', [
                    'error' => $e->getMessage()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Error de conexion a base de datos Novik/7Power. Verifica las credenciales DB_7POWER_* en el archivo .env',
                    'error' => $e->getMessage()
                ], 500);
            }

            Log::info(' Sincronización manual iniciada por usuario', [
                'user_id'      => $request->user()->id ?? 'guest',
                'company_id'   => $companyId,
                'warehouse_id' => $warehouseId,
                'timestamp'    => now()
            ]);

            // Ejecutar el comando de sincronización
            Artisan::call('sync:7power', [
                '--company'   => $companyId,
                '--warehouse' => $warehouseId,
            ]);

            // Obtener la salida del comando
            $output = Artisan::output();

            // Actualizar stock de productos existentes
            Log::info(' Actualizando stock de productos existentes...');
            Artisan::call('sync:7power', [
                '--update-stock' => true,
                '--company'      => $companyId,
                '--warehouse'    => $warehouseId,
            ]);
            $stockOutput = Artisan::output();
            
            // Combinar ambas salidas
            $fullOutput = $output . "\n" . $stockOutput;
            
            // Limpiar caracteres UTF-8 problematicos (emojis)
            $fullOutput = mb_convert_encoding($fullOutput, 'UTF-8', 'UTF-8');
            $fullOutput = preg_replace('/[\x00-\x1F\x7F-\x9F]/u', '', $fullOutput);
            
            Log::info('Sincronizacion manual completada');

            return response()->json([
                'success' => true,
                'message' => 'Sincronizacion completada exitosamente',
                'output' => $fullOutput,
                'timestamp' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error(' Error en sincronización manual', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al ejecutar la sincronización',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Diagnóstico de stock: compara stock en 7Power vs Magus
     */
    public function diagnosticoStock(Request $request)
    {
        $companyId   = (int) $request->input('company_id', 1);
        $warehouseId = (int) $request->input('warehouse_id', 1);

        try {
            DB::connection('mysql_7power')->getPdo();
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Sin conexión a 7Power: ' . $e->getMessage()], 500);
        }

        // Obtener todos los mapeos
        $mapeos = DB::table('producto_mapeo_7power')->get();

        $resultado = [];

        foreach ($mapeos as $mapeo) {
            // Stock en 7Power del almacén indicado (igual que la vista /stock?action=show)
            $stockPorAlmacen = DB::connection('mysql_7power')
                ->table('product_warehouse')
                ->join('warehouses', 'product_warehouse.warehouse_id', '=', 'warehouses.id')
                ->where('product_warehouse.product_id', $mapeo->producto_7power_id)
                ->where('warehouses.company_id', $companyId)
                ->where('product_warehouse.warehouse_id', $warehouseId)
                ->select('warehouses.id as warehouse_id', 'warehouses.name as almacen', 'product_warehouse.stock')
                ->get();

            $stockTotal7Power = $stockPorAlmacen->sum('stock');

            // Stock sin filtro (para comparar)
            $stockSinFiltro = DB::connection('mysql_7power')
                ->table('product_warehouse')
                ->where('product_id', $mapeo->producto_7power_id)
                ->sum('stock');

            // Stock en Magus
            $productoMagus = DB::table('productos')
                ->where('id', $mapeo->producto_id)
                ->select('nombre', 'codigo_producto', 'stock')
                ->first();

            if (!$productoMagus) continue;

            $diferencia = $stockTotal7Power - $productoMagus->stock;

            $resultado[] = [
                'codigo'          => $productoMagus->codigo_producto,
                'nombre'          => $productoMagus->nombre,
                'stock_magus'     => $productoMagus->stock,
                'stock_7power'    => $stockTotal7Power,
                'stock_sin_filtro'=> $stockSinFiltro,
                'diferencia'      => $diferencia,
                'almacenes'       => $stockPorAlmacen,
            ];
        }

        // Ordenar por mayor diferencia primero
        usort($resultado, fn($a, $b) => abs($b['diferencia']) <=> abs($a['diferencia']));

        return response()->json([
            'success' => true,
            'total_productos' => count($resultado),
            'productos' => $resultado,
        ]);
    }

    /**
     * Obtener estado de la última sincronización
     */
    public function estadoSincronizacion()
    {
        try {
            // Obtener estadísticas de la sincronización
            $marcasCount = DB::table('marca_mapeo_7power')->count();
            $categoriasCount = DB::table('categoria_mapeo_7power')->count();
            
            // Obtener última actualización
            $ultimaMarca = DB::table('marca_mapeo_7power')
                ->orderBy('updated_at', 'desc')
                ->first();
            
            $ultimaCategoria = DB::table('categoria_mapeo_7power')
                ->orderBy('updated_at', 'desc')
                ->first();

            $ultimaActualizacion = null;
            if ($ultimaMarca && $ultimaCategoria) {
                $ultimaActualizacion = max($ultimaMarca->updated_at, $ultimaCategoria->updated_at);
            } elseif ($ultimaMarca) {
                $ultimaActualizacion = $ultimaMarca->updated_at;
            } elseif ($ultimaCategoria) {
                $ultimaActualizacion = $ultimaCategoria->updated_at;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'marcas_sincronizadas' => $marcasCount,
                    'categorias_sincronizadas' => $categoriasCount,
                    'ultima_actualizacion' => $ultimaActualizacion,
                    'estado' => $marcasCount > 0 || $categoriasCount > 0 ? 'activo' : 'pendiente'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estado de sincronización',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
