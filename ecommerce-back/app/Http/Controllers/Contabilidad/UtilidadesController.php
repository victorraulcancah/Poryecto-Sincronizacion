<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\GastoOperativo;
use App\Models\Kardex;
use App\Models\Producto;
use App\Models\UtilidadMensual;
use App\Models\UtilidadVenta;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UtilidadesController extends Controller
{
    /**
     * Calcular utilidad de una venta específica
     * POST porque modifica/guarda datos en la tabla utilidad_ventas
     */
    public function calcularUtilidadVenta($ventaId)
    {
        $venta = Venta::with('detalles.producto')->findOrFail($ventaId);

        $costoTotal = 0;
        $detallesUtilidad = [];

        foreach ($venta->detalles as $detalle) {
            // Obtener costo promedio del kardex
            $kardex = Kardex::where('producto_id', $detalle->producto_id)
                ->where('fecha', '<=', $venta->created_at)
                ->latest('id')
                ->first();

            $costoUnitario = $kardex ? $kardex->costo_promedio : $detalle->producto->precio_compra;
            $costoItem = $costoUnitario * $detalle->cantidad;
            $costoTotal += $costoItem;

            $detallesUtilidad[] = [
                'producto' => $detalle->producto->nombre,
                'cantidad' => $detalle->cantidad,
                'precio_venta' => $detalle->precio_unitario,
                'costo_unitario' => $costoUnitario,
                'subtotal_venta' => $detalle->subtotal,
                'subtotal_costo' => $costoItem,
                'utilidad' => $detalle->subtotal - $costoItem,
                'margen' => $detalle->subtotal > 0 ? (($detalle->subtotal - $costoItem) / $detalle->subtotal) * 100 : 0,
            ];
        }

        $utilidadBruta = $venta->total - $costoTotal;
        $margenPorcentaje = $venta->total > 0 ? ($utilidadBruta / $venta->total) * 100 : 0;

        // Guardar en tabla de utilidades
        UtilidadVenta::updateOrCreate(
            ['venta_id' => $venta->id],
            [
                'fecha_venta' => $venta->created_at->toDateString(),
                'total_venta' => $venta->total,
                'costo_total' => $costoTotal,
                'utilidad_bruta' => $utilidadBruta,
                'margen_porcentaje' => $margenPorcentaje,
                'utilidad_neta' => $utilidadBruta,
            ]
        );

        return response()->json([
            'venta_id' => $venta->id,
            'fecha' => $venta->created_at,
            'total_venta' => $venta->total,
            'costo_total' => $costoTotal,
            'utilidad_bruta' => $utilidadBruta,
            'margen_porcentaje' => round($margenPorcentaje, 2),
            'detalles' => $detallesUtilidad,
        ]);
    }

    /**
     * Reporte de utilidades por período
     */
    public function reporteUtilidades(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->toDateString();

        // Ventas del período
        $ventas = Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();

        $totalVentas = 0;
        $totalCostos = 0;

        foreach ($ventas as $venta) {
            $costoVenta = 0;
            foreach ($venta->detalles as $detalle) {
                $kardex = Kardex::where('producto_id', $detalle->producto_id)
                    ->where('fecha', '<=', $venta->created_at)
                    ->latest('id')
                    ->first();

                $costoUnitario = $kardex ? $kardex->costo_promedio : $detalle->producto->precio_compra;
                $costoVenta += $costoUnitario * $detalle->cantidad;
            }

            $totalVentas += $venta->total;
            $totalCostos += $costoVenta;
        }

        // Gastos operativos del período
        $gastosOperativos = GastoOperativo::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->sum('monto');

        $utilidadBruta = $totalVentas - $totalCostos;
        $utilidadOperativa = $utilidadBruta - $gastosOperativos;
        $utilidadNeta = $utilidadOperativa;

        $margenBruto = $totalVentas > 0 ? ($utilidadBruta / $totalVentas) * 100 : 0;
        $margenOperativo = $totalVentas > 0 ? ($utilidadOperativa / $totalVentas) * 100 : 0;
        $margenNeto = $totalVentas > 0 ? ($utilidadNeta / $totalVentas) * 100 : 0;

        return response()->json([
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
            ],
            'ventas' => [
                'total' => $totalVentas,
                'cantidad' => $ventas->count(),
            ],
            'costos' => [
                'costo_ventas' => $totalCostos,
                'gastos_operativos' => $gastosOperativos,
                'total_costos' => $totalCostos + $gastosOperativos,
            ],
            'utilidad' => [
                'utilidad_bruta' => $utilidadBruta,
                'margen_bruto' => round($margenBruto, 2),
                'utilidad_operativa' => $utilidadOperativa,
                'margen_operativo' => round($margenOperativo, 2),
                'utilidad_neta' => $utilidadNeta,
                'margen_neto' => round($margenNeto, 2),
            ],
        ]);
    }

    /**
     * Utilidad por producto
     */
    public function utilidadPorProducto(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->toDateString();

        $productos = DB::table('venta_detalles')
            ->join('ventas', 'venta_detalles.venta_id', '=', 'ventas.id')
            ->join('productos', 'venta_detalles.producto_id', '=', 'productos.id')
            ->whereBetween('ventas.created_at', [$fechaInicio, $fechaFin])
            ->select(
                'productos.id',
                'productos.nombre',
                'productos.codigo_producto',
                DB::raw('SUM(venta_detalles.cantidad) as cantidad_vendida'),
                DB::raw('SUM(venta_detalles.subtotal) as total_ventas'),
                DB::raw('AVG(venta_detalles.precio_unitario) as precio_promedio')
            )
            ->groupBy('productos.id', 'productos.nombre', 'productos.codigo_producto')
            ->get();

        $resultado = $productos->map(function ($item) {
            $kardex = Kardex::where('producto_id', $item->id)->latest('id')->first();
            $costoPromedio = $kardex ? $kardex->costo_promedio : 0;
            $totalCostos = $item->cantidad_vendida * $costoPromedio;
            $utilidad = $item->total_ventas - $totalCostos;
            $margen = $item->total_ventas > 0 ? ($utilidad / $item->total_ventas) * 100 : 0;

            return [
                'producto_id' => $item->id,
                'codigo' => $item->codigo_producto,
                'nombre' => $item->nombre,
                'cantidad_vendida' => $item->cantidad_vendida,
                'precio_promedio' => round($item->precio_promedio, 2),
                'costo_promedio' => $costoPromedio,
                'total_ventas' => $item->total_ventas,
                'total_costos' => $totalCostos,
                'utilidad' => $utilidad,
                'margen_porcentaje' => round($margen, 2),
            ];
        })->sortByDesc('utilidad')->values();

        return response()->json([
            'productos' => $resultado,
            'resumen' => [
                'total_ventas' => $resultado->sum('total_ventas'),
                'total_costos' => $resultado->sum('total_costos'),
                'utilidad_total' => $resultado->sum('utilidad'),
            ],
        ]);
    }

    /**
     * Registrar gasto operativo
     */
    public function registrarGasto(Request $request)
    {
        $request->validate([
            'fecha' => 'required|date',
            'categoria' => 'required|in:ALQUILER,SERVICIOS,SUELDOS,MARKETING,TRANSPORTE,MANTENIMIENTO,IMPUESTOS,OTROS',
            'concepto' => 'required|string|max:200',
            'monto' => 'required|numeric|min:0',
            'comprobante_tipo' => 'nullable|string|max:20',
            'comprobante_numero' => 'nullable|string|max:50',
            'proveedor_id' => 'nullable|exists:proveedores,id',
            'es_fijo' => 'boolean',
            'es_recurrente' => 'boolean',
            'descripcion' => 'nullable|string',
        ]);

        $gasto = GastoOperativo::create([
            ...$request->all(),
            'user_id' => auth()->id(),
        ]);

        return response()->json($gasto, 201);
    }

    /**
     * Listar gastos operativos
     */
    public function listarGastos(Request $request)
    {
        $query = GastoOperativo::with(['proveedor', 'user']);

        if ($request->fecha_inicio) {
            $query->where('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha', '<=', $request->fecha_fin);
        }

        if ($request->categoria) {
            $query->where('categoria', $request->categoria);
        }

        $gastos = $query->orderBy('fecha', 'desc')->paginate(20);

        return response()->json($gastos);
    }

    /**
     * Gastos por categoría
     */
    public function gastosPorCategoria(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->toDateString();

        $gastos = GastoOperativo::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->select('categoria', DB::raw('SUM(monto) as total'))
            ->groupBy('categoria')
            ->get();

        return response()->json([
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
            ],
            'gastos_por_categoria' => $gastos,
            'total_gastos' => $gastos->sum('total'),
        ]);
    }

    /**
     * Calcular y guardar utilidad mensual
     */
    public function calcularUtilidadMensual($mes, $anio)
    {
        $fechaInicio = Carbon::create($anio, $mes, 1)->startOfMonth();
        $fechaFin = Carbon::create($anio, $mes, 1)->endOfMonth();

        // Ventas del mes
        $ventas = Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();

        $totalVentas = 0;
        $totalCostos = 0;

        foreach ($ventas as $venta) {
            $costoVenta = 0;
            foreach ($venta->detalles as $detalle) {
                $kardex = Kardex::where('producto_id', $detalle->producto_id)
                    ->where('fecha', '<=', $venta->created_at)
                    ->latest('id')
                    ->first();

                $costoUnitario = $kardex ? $kardex->costo_promedio : $detalle->producto->precio_compra;
                $costoVenta += $costoUnitario * $detalle->cantidad;
            }

            $totalVentas += $venta->total;
            $totalCostos += $costoVenta;
        }

        // Gastos operativos
        $gastosOperativos = GastoOperativo::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->sum('monto');

        $utilidadBruta = $totalVentas - $totalCostos;
        $utilidadOperativa = $utilidadBruta - $gastosOperativos;
        $utilidadNeta = $utilidadOperativa;

        $margenBruto = $totalVentas > 0 ? ($utilidadBruta / $totalVentas) * 100 : 0;
        $margenOperativo = $totalVentas > 0 ? ($utilidadOperativa / $totalVentas) * 100 : 0;
        $margenNeto = $totalVentas > 0 ? ($utilidadNeta / $totalVentas) * 100 : 0;

        // Guardar resumen mensual
        $utilidadMensual = UtilidadMensual::updateOrCreate(
            ['mes' => $mes, 'anio' => $anio],
            [
                'total_ventas' => $totalVentas,
                'total_costos' => $totalCostos,
                'utilidad_bruta' => $utilidadBruta,
                'margen_bruto_porcentaje' => $margenBruto,
                'gastos_operativos' => $gastosOperativos,
                'utilidad_operativa' => $utilidadOperativa,
                'margen_operativo_porcentaje' => $margenOperativo,
                'utilidad_neta' => $utilidadNeta,
                'margen_neto_porcentaje' => $margenNeto,
            ]
        );

        return response()->json($utilidadMensual);
    }

    /**
     * Comparativa de utilidades mensuales
     */
    public function comparativaMensual($anio)
    {
        $utilidades = UtilidadMensual::where('anio', $anio)
            ->orderBy('mes')
            ->get();

        return response()->json([
            'anio' => $anio,
            'meses' => $utilidades,
            'totales' => [
                'total_ventas' => $utilidades->sum('total_ventas'),
                'total_costos' => $utilidades->sum('total_costos'),
                'utilidad_bruta' => $utilidades->sum('utilidad_bruta'),
                'gastos_operativos' => $utilidades->sum('gastos_operativos'),
                'utilidad_neta' => $utilidades->sum('utilidad_neta'),
            ],
        ]);
    }

    /**
     * Punto de equilibrio
     */
    public function puntoEquilibrio(Request $request)
    {
        $mes = $request->mes ?? now()->month;
        $anio = $request->anio ?? now()->year;

        $fechaInicio = Carbon::create($anio, $mes, 1)->startOfMonth();
        $fechaFin = Carbon::create($anio, $mes, 1)->endOfMonth();

        // Gastos fijos del mes
        $gastosFijos = GastoOperativo::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->where('es_fijo', true)
            ->sum('monto');

        // Calcular margen de contribución promedio
        $ventas = Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();

        $totalVentas = $ventas->sum('total');
        $totalCostos = 0;

        foreach ($ventas as $venta) {
            foreach ($venta->detalles as $detalle) {
                $kardex = Kardex::where('producto_id', $detalle->producto_id)->latest('id')->first();
                $costoUnitario = $kardex ? $kardex->costo_promedio : $detalle->producto->precio_compra;
                $totalCostos += $costoUnitario * $detalle->cantidad;
            }
        }

        $margenContribucion = $totalVentas > 0 ? (($totalVentas - $totalCostos) / $totalVentas) : 0;
        $puntoEquilibrio = $margenContribucion > 0 ? $gastosFijos / $margenContribucion : 0;

        return response()->json([
            'mes' => $mes,
            'anio' => $anio,
            'gastos_fijos' => $gastosFijos,
            'margen_contribucion_porcentaje' => round($margenContribucion * 100, 2),
            'punto_equilibrio_ventas' => round($puntoEquilibrio, 2),
            'ventas_actuales' => $totalVentas,
            'diferencia' => $totalVentas - $puntoEquilibrio,
            'alcanzado' => $totalVentas >= $puntoEquilibrio,
        ]);
    }
}
