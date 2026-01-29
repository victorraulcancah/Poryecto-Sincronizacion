<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Pedido;
use App\Models\UserCliente;
use App\Models\Producto;
use App\Models\Venta;


class DashboardController extends Controller
{
 // ============================================
    // MÉTODOS PARA DASHBOARD DINÁMICO
    // ============================================

    /**
     * Obtiene estadísticas generales del dashboard
     * GET /api/dashboard/estadisticas
     */
    public function estadisticasDashboard(Request $request)
    {
        try {
            // Obtener estadísticas básicas
            $totalPedidos = Pedido::count();
            $totalClientes = UserCliente::where('estado', true)->count();
            $totalProductos = Producto::where('activo', true)->count();
            
            // Calcular ingresos totales (desde ventas facturadas)
            $totalIngresos = Venta::where('estado', 'FACTURADO')
                ->sum('total');
            
            // Ganancias del mes actual
            $mesActual = now()->format('Y-m');
            $gananciasMes = Venta::where('estado', 'FACTURADO')
                ->whereRaw("DATE_FORMAT(fecha_venta, '%Y-%m') = ?", [$mesActual])
                ->sum('total');

            // Obtener producto del mes
            $productoDelMes = $this->obtenerProductoDelMesData();

            return response()->json([
                'total_pedidos' => $totalPedidos,
                'total_clientes' => $totalClientes,
                'total_ingresos' => (float) $totalIngresos,
                'total_productos' => $totalProductos,
                'ganancias_mes_actual' => (float) $gananciasMes,
                'producto_del_mes' => $productoDelMes
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener estadísticas del dashboard: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene el producto más vendido del mes
     * GET /api/dashboard/producto-del-mes
     */
    public function productoDelMes(Request $request)
    {
        try {
            $mes = $request->get('mes', now()->month);
            $año = $request->get('año', now()->year);
            
            $productoDelMes = $this->obtenerProductoDelMesData($mes, $año);

            return response()->json([
                'data' => $productoDelMes
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener producto del mes: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al obtener producto del mes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene categorías más vendidas para gráfico
     * GET /api/dashboard/categorias-vendidas
     */
    public function categoriasVendidas(Request $request)
    {
        try {
            $limite = $request->get('limite', 4);
            
            // Obtener categorías más vendidas basado en venta_detalles
            $categorias = DB::table('venta_detalles as vd')
                ->join('productos as p', 'vd.producto_id', '=', 'p.id')
                ->join('categorias as c', 'p.categoria_id', '=', 'c.id')
                ->join('ventas as v', 'vd.venta_id', '=', 'v.id')
                ->where('v.estado', 'FACTURADO')
                ->select(
                    'c.id',
                    'c.nombre',
                    DB::raw('SUM(vd.cantidad) as total_vendido'),
                    DB::raw('SUM(vd.total_linea) as ventas_total')
                )
                ->groupBy('c.id', 'c.nombre')
                ->orderBy('total_vendido', 'desc')
                ->limit($limite)
                ->get();

            // Calcular total para porcentajes
            $totalVentas = $categorias->sum('total_vendido');
            
            // Colores predefinidos
            $colores = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
            
            $categoriasFormateadas = $categorias->map(function ($categoria, $index) use ($totalVentas, $colores) {
                $porcentaje = $totalVentas > 0 ? round(($categoria->total_vendido / $totalVentas) * 100, 1) : 0;
                
                return [
                    'id' => $categoria->id,
                    'nombre' => $categoria->nombre,
                    'porcentaje' => $porcentaje,
                    'color' => $colores[$index % count($colores)],
                    'ventas_total' => (float) $categoria->ventas_total
                ];
            });

            return response()->json([
                'data' => $categoriasFormateadas
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener categorías vendidas: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al obtener categorías vendidas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene pedidos por día de la semana
     * GET /api/dashboard/pedidos-por-dia
     */
    public function pedidosPorDia(Request $request)
    {
        try {
            // Obtener pedidos de los últimos 30 días agrupados por día de la semana
            $pedidosPorDia = DB::table('pedidos')
                ->select(
                    DB::raw('DAYOFWEEK(created_at) - 1 as dia_numero'),
                    DB::raw('COUNT(*) as cantidad_pedidos')
                )
                ->where('created_at', '>=', now()->subDays(30))
                ->groupBy('dia_numero')
                ->orderBy('dia_numero')
                ->get();

            // Nombres de días en español
            $nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            
            // Crear array completo con todos los días (incluso si no hay pedidos)
            $resultado = [];
            for ($i = 0; $i < 7; $i++) {
                $pedidosDelDia = $pedidosPorDia->firstWhere('dia_numero', $i);
                
                $resultado[] = [
                    'dia_semana' => $nombresDias[$i],
                    'dia_numero' => $i,
                    'cantidad_pedidos' => $pedidosDelDia ? (int) $pedidosDelDia->cantidad_pedidos : 0
                ];
            }

            return response()->json([
                'data' => $resultado
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener pedidos por día: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al obtener pedidos por día',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene ventas de los últimos meses
     * GET /api/dashboard/ventas-mensuales
     */
    public function ventasMensuales(Request $request)
    {
        try {
            $meses = $request->get('meses', 6);
            
            $ventasMensuales = DB::table('ventas')
                ->select(
                    DB::raw('MONTH(fecha_venta) as mes'),
                    DB::raw('YEAR(fecha_venta) as año'),
                    DB::raw('SUM(total) as total_ventas')
                )
                ->where('estado', 'FACTURADO')
                ->where('fecha_venta', '>=', now()->subMonths($meses))
                ->groupBy('año', 'mes')
                ->orderBy('año', 'asc')
                ->orderBy('mes', 'asc')
                ->get();

            // Nombres de meses en español
            $nombresMeses = [
                1 => 'Ene', 2 => 'Feb', 3 => 'Mar', 4 => 'Abr',
                5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Ago',
                9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dic'
            ];

            $resultado = $ventasMensuales->map(function ($venta) use ($nombresMeses) {
                return [
                    'mes' => $venta->mes,
                    'anio' => $venta->año,
                    'nombre_mes' => $nombresMeses[$venta->mes],
                    'total_ventas' => (float) $venta->total_ventas
                ];
            });

            return response()->json([
                'data' => $resultado
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener ventas mensuales: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al obtener ventas mensuales',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ============================================
    // MÉTODOS AUXILIARES PRIVADOS
    // ============================================

    /**
     * Obtiene los datos del producto más vendido del mes
     */
    private function obtenerProductoDelMesData($mes = null, $año = null)
    {
        $mes = $mes ?? now()->month;
        $año = $año ?? now()->year;
        
        // Obtener el producto más vendido del mes desde venta_detalles
        $productoMasVendido = DB::table('venta_detalles as vd')
            ->join('productos as p', 'vd.producto_id', '=', 'p.id')
            ->join('ventas as v', 'vd.venta_id', '=', 'v.id')
            ->where('v.estado', 'FACTURADO')
            ->whereMonth('v.fecha_venta', $mes)
            ->whereYear('v.fecha_venta', $año)
            ->select(
                'p.id',
                'p.nombre',
                'p.imagen',
                DB::raw('SUM(vd.cantidad) as ventas_cantidad'),
                DB::raw('SUM(vd.total_linea) as ventas_total')
            )
            ->groupBy('p.id', 'p.nombre', 'p.imagen')
            ->orderBy('ventas_cantidad', 'desc')
            ->first();

        if (!$productoMasVendido) {
            return null;
        }

        // Calcular crecimiento comparando con el mes anterior
        $mesAnterior = $mes == 1 ? 12 : $mes - 1;
        $añoAnterior = $mes == 1 ? $año - 1 : $año;
        
        $ventasAnterior = DB::table('venta_detalles as vd')
            ->join('ventas as v', 'vd.venta_id', '=', 'v.id')
            ->where('v.estado', 'FACTURADO')
            ->where('vd.producto_id', $productoMasVendido->id)
            ->whereMonth('v.fecha_venta', $mesAnterior)
            ->whereYear('v.fecha_venta', $añoAnterior)
            ->sum('vd.cantidad');

        $crecimiento = 0;
        if ($ventasAnterior > 0) {
            $crecimiento = (($productoMasVendido->ventas_cantidad - $ventasAnterior) / $ventasAnterior) * 100;
        } elseif ($productoMasVendido->ventas_cantidad > 0) {
            $crecimiento = 100; // 100% de crecimiento si no había ventas anteriores
        }

        // Nombres de meses en español
        $nombresMeses = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
        ];

        return [
            'id' => $productoMasVendido->id,
            'nombre' => $productoMasVendido->nombre,
            'imagen_principal' => $productoMasVendido->imagen ? asset('storage/productos/' . $productoMasVendido->imagen) : null,
            'ventas_cantidad' => (int) $productoMasVendido->ventas_cantidad,
            'ventas_total' => (float) $productoMasVendido->ventas_total,
            'crecimiento_porcentaje' => round($crecimiento, 1),
            'periodo' => [
                'mes' => $mes,
                'anio' => $año,
                'nombre_mes' => $nombresMeses[$mes]
            ]
        ];
    }
}