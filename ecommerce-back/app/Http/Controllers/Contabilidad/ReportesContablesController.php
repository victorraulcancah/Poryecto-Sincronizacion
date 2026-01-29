<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\Venta;
use App\Models\Producto;
use App\Models\Kardex;
use App\Models\CuentaPorCobrar;
use App\Models\CuentaPorPagar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportesContablesController extends Controller
{
    // Reporte de ventas
    public function ventasDiarias(Request $request)
    {
        $fecha = $request->fecha ?? now()->toDateString();

        $ventas = Venta::with(['detalles.producto', 'cliente'])
            ->whereDate('created_at', $fecha)
            ->get();

        $totalVentas = $ventas->sum('total');
        $cantidadVentas = $ventas->count();

        return response()->json([
            'fecha' => $fecha,
            'ventas' => $ventas,
            'resumen' => [
                'cantidad_ventas' => $cantidadVentas,
                'total_ventas' => $totalVentas,
                'ticket_promedio' => $cantidadVentas > 0 ? $totalVentas / $cantidadVentas : 0
            ]
        ]);
    }

    public function ventasMensuales(Request $request)
    {
        $mes = $request->mes ?? now()->month;
        $anio = $request->anio ?? now()->year;

        $ventas = Venta::whereYear('created_at', $anio)
            ->whereMonth('created_at', $mes)
            ->selectRaw('DATE(created_at) as fecha, COUNT(*) as cantidad, SUM(total) as total')
            ->groupBy('fecha')
            ->orderBy('fecha')
            ->get();

        return response()->json([
            'mes' => $mes,
            'anio' => $anio,
            'ventas_diarias' => $ventas,
            'total_mes' => $ventas->sum('total')
        ]);
    }

    // Productos más vendidos
    public function productosMasVendidos(Request $request)
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
                DB::raw('SUM(venta_detalles.subtotal) as total_vendido')
            )
            ->groupBy('productos.id', 'productos.nombre', 'productos.codigo_producto')
            ->orderByDesc('cantidad_vendida')
            ->limit(20)
            ->get();

        return response()->json($productos);
    }

    // Rentabilidad por producto
    public function rentabilidadProductos(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->toDateString();

        $productos = Producto::with(['categoria'])->get();

        $rentabilidad = $productos->map(function ($producto) use ($fechaInicio, $fechaFin) {
            // Obtener ventas del producto
            $ventas = DB::table('venta_detalles')
                ->join('ventas', 'venta_detalles.venta_id', '=', 'ventas.id')
                ->where('venta_detalles.producto_id', $producto->id)
                ->whereBetween('ventas.created_at', [$fechaInicio, $fechaFin])
                ->select(
                    DB::raw('SUM(venta_detalles.cantidad) as cantidad'),
                    DB::raw('SUM(venta_detalles.subtotal) as total_ventas')
                )
                ->first();

            if (!$ventas || $ventas->cantidad == 0) {
                return null;
            }

            // Obtener costo promedio del kardex
            $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
            $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $producto->precio_compra;

            $costoTotal = $ventas->cantidad * $costoPromedio;
            $utilidad = $ventas->total_ventas - $costoTotal;
            $margen = $ventas->total_ventas > 0 ? ($utilidad / $ventas->total_ventas) * 100 : 0;

            return [
                'producto_id' => $producto->id,
                'codigo' => $producto->codigo_producto,
                'nombre' => $producto->nombre,
                'categoria' => $producto->categoria->nombre ?? '',
                'cantidad_vendida' => $ventas->cantidad,
                'total_ventas' => $ventas->total_ventas,
                'costo_promedio' => $costoPromedio,
                'costo_total' => $costoTotal,
                'utilidad' => $utilidad,
                'margen_porcentaje' => round($margen, 2)
            ];
        })->filter()->sortByDesc('utilidad')->values();

        return response()->json([
            'productos' => $rentabilidad,
            'resumen' => [
                'total_ventas' => $rentabilidad->sum('total_ventas'),
                'total_costos' => $rentabilidad->sum('costo_total'),
                'utilidad_total' => $rentabilidad->sum('utilidad')
            ]
        ]);
    }

    // Dashboard financiero
    public function dashboardFinanciero()
    {
        $hoy = now()->toDateString();
        $mesActual = now()->month;
        $anioActual = now()->year;

        // Ventas del día
        $ventasHoy = Venta::whereDate('created_at', $hoy)->sum('total');

        // Ventas del mes
        $ventasMes = Venta::whereYear('created_at', $anioActual)
            ->whereMonth('created_at', $mesActual)
            ->sum('total');

        // Cuentas por cobrar
        $cxcPendiente = CuentaPorCobrar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->sum('saldo_pendiente');

        $cxcVencidas = CuentaPorCobrar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->where('fecha_vencimiento', '<', $hoy)
            ->sum('saldo_pendiente');

        // Cuentas por pagar
        $cxpPendiente = CuentaPorPagar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->sum('saldo_pendiente');

        $cxpVencidas = CuentaPorPagar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->where('fecha_vencimiento', '<', $hoy)
            ->sum('saldo_pendiente');

        // Inventario valorizado
        $productos = Producto::where('activo', true)->get();
        $inventarioValor = $productos->sum(function ($producto) {
            $ultimoKardex = Kardex::where('producto_id', $producto->id)->latest('id')->first();
            $costoPromedio = $ultimoKardex ? $ultimoKardex->costo_promedio : $producto->precio_compra;
            return $producto->stock * $costoPromedio;
        });

        return response()->json([
            'ventas' => [
                'hoy' => $ventasHoy,
                'mes' => $ventasMes
            ],
            'cuentas_por_cobrar' => [
                'pendiente' => $cxcPendiente,
                'vencidas' => $cxcVencidas
            ],
            'cuentas_por_pagar' => [
                'pendiente' => $cxpPendiente,
                'vencidas' => $cxpVencidas
            ],
            'inventario' => [
                'valor_total' => $inventarioValor,
                'productos_activos' => $productos->count()
            ]
        ]);
    }
}
