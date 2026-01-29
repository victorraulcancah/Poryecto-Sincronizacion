<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\Kardex;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KardexController extends Controller
{
    public function index(Request $request)
    {
        $query = Producto::with(['categoria', 'marca'])
            ->where('activo', true);

        // Filtros
        if ($request->categoria_id) {
            $query->where('categoria_id', $request->categoria_id);
        }

        if ($request->stock_bajo) {
            $query->where('stock', '<=', DB::raw('stock_minimo'));
        }

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('nombre', 'like', "%{$request->search}%")
                  ->orWhere('codigo_producto', 'like', "%{$request->search}%");
            });
        }

        $productos = $query->get();

        // Agregar información de kardex a cada producto
        $inventario = $productos->map(function ($producto) {
            $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
            $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $producto->precio_compra;

            return [
                'producto_id' => $producto->id,
                'codigo' => $producto->codigo_producto,
                'nombre' => $producto->nombre,
                'categoria' => $producto->categoria->nombre ?? '',
                'stock_actual' => $producto->stock,
                'stock_minimo' => $producto->stock_minimo,
                'costo_promedio' => $costoPromedio,
                'valor_total' => $producto->stock * $costoPromedio,
                'alerta_stock' => $producto->stock <= $producto->stock_minimo
            ];
        });

        return response()->json([
            'productos' => $inventario,
            'total_productos' => $inventario->count(),
            'total_valorizado' => $inventario->sum('valor_total'),
            'productos_bajo_stock' => $inventario->where('alerta_stock', true)->count()
        ]);
    }

    // Ver kardex de un producto
    public function show($productoId, Request $request)
    {
        $query = Kardex::where('producto_id', $productoId)
            ->with(['producto', 'user']);

        if ($request->fecha_inicio) {
            $query->where('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha', '<=', $request->fecha_fin);
        }

        $kardex = $query->orderBy('fecha')->orderBy('id')->get();

        $producto = Producto::findOrFail($productoId);

        return response()->json([
            'producto' => $producto,
            'movimientos' => $kardex,
            'stock_actual' => $producto->stock,
            'costo_promedio' => $kardex->last()->costo_promedio ?? 0
        ]);
    }

    // Registrar ajuste de inventario
    public function ajuste(Request $request)
    {
        $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'cantidad' => 'required|integer',
            'tipo' => 'required|in:AJUSTE_POSITIVO,AJUSTE_NEGATIVO',
            'costo_unitario' => 'required|numeric|min:0',
            'observaciones' => 'required|string'
        ]);

        DB::beginTransaction();
        try {
            $producto = Producto::findOrFail($request->producto_id);
            $stockAnterior = $producto->stock;
            
            $cantidad = $request->tipo === 'AJUSTE_POSITIVO' ? $request->cantidad : -$request->cantidad;
            $stockActual = $stockAnterior + $cantidad;

            // Calcular costo promedio
            $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
            $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $request->costo_unitario;

            if ($request->tipo === 'AJUSTE_POSITIVO') {
                $costoPromedio = (($stockAnterior * $costoPromedio) + ($request->cantidad * $request->costo_unitario)) / $stockActual;
            }

            // Registrar en kardex
            Kardex::create([
                'producto_id' => $producto->id,
                'fecha' => now()->toDateString(),
                'tipo_movimiento' => $request->tipo === 'AJUSTE_POSITIVO' ? 'ENTRADA' : 'SALIDA',
                'tipo_operacion' => $request->tipo,
                'cantidad' => abs($cantidad),
                'costo_unitario' => $request->costo_unitario,
                'costo_total' => abs($cantidad) * $request->costo_unitario,
                'stock_anterior' => $stockAnterior,
                'stock_actual' => $stockActual,
                'costo_promedio' => $costoPromedio,
                'user_id' => auth()->id(),
                'observaciones' => $request->observaciones
            ]);

            // Actualizar stock del producto
            $producto->update(['stock' => $stockActual]);

            DB::commit();
            return response()->json(['message' => 'Ajuste registrado correctamente']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // Reporte valorizado de inventario
    public function inventarioValorizado()
    {
        $productos = Producto::with(['categoria', 'marca'])->where('activo', true)->get();

        $inventario = $productos->map(function ($producto) {
            $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
            $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $producto->precio_compra;

            return [
                'producto_id' => $producto->id,
                'codigo' => $producto->codigo_producto,
                'nombre' => $producto->nombre,
                'categoria' => $producto->categoria->nombre ?? '',
                'stock' => $producto->stock,
                'costo_promedio' => $costoPromedio,
                'valor_total' => $producto->stock * $costoPromedio
            ];
        });

        return response()->json([
            'inventario' => $inventario,
            'total_valorizado' => $inventario->sum('valor_total')
        ]);
    }
}
