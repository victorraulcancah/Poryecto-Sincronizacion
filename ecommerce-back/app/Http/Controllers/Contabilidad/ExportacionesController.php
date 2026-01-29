<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\CajaMovimiento;
use App\Models\Kardex;
use App\Models\CuentaPorCobrar;
use App\Models\CuentaPorPagar;
use App\Models\GastoOperativo;
use App\Models\Venta;
use App\Services\ExportacionTxtService;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class ExportacionesController extends Controller
{
    /**
     * Exportar reporte de caja en PDF
     */
    public function exportarCajaPDF($id)
    {
        $movimiento = CajaMovimiento::with(['caja', 'user', 'transacciones'])->findOrFail($id);

        $ingresos = $movimiento->transacciones()->where('tipo', 'INGRESO')->sum('monto');
        $egresos = $movimiento->transacciones()->where('tipo', 'EGRESO')->sum('monto');

        $data = [
            'movimiento' => $movimiento,
            'ingresos' => $ingresos,
            'egresos' => $egresos,
            'monto_sistema' => $movimiento->monto_inicial + $ingresos - $egresos
        ];

        $pdf = PDF::loadView('exports.caja-pdf', $data);
        return $pdf->download('reporte-caja-' . $movimiento->fecha . '.pdf');
    }

    /**
     * Exportar reporte de caja en Excel (CSV)
     */
    public function exportarCajaExcel($id)
    {
        $movimiento = CajaMovimiento::with(['caja', 'user', 'transacciones'])->findOrFail($id);

        $filename = 'reporte-caja-' . $movimiento->fecha . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($movimiento) {
            $file = fopen('php://output', 'w');
            
            // Encabezados
            fputcsv($file, ['REPORTE DE CAJA']);
            fputcsv($file, ['Caja:', $movimiento->caja->nombre]);
            fputcsv($file, ['Fecha:', $movimiento->fecha]);
            fputcsv($file, ['Usuario:', $movimiento->user->name]);
            fputcsv($file, []);
            
            // Detalle de transacciones
            fputcsv($file, ['Tipo', 'Categoría', 'Monto', 'Método Pago', 'Descripción']);
            
            foreach ($movimiento->transacciones as $trans) {
                fputcsv($file, [
                    $trans->tipo,
                    $trans->categoria,
                    $trans->monto,
                    $trans->metodo_pago,
                    $trans->descripcion
                ]);
            }
            
            fputcsv($file, []);
            fputcsv($file, ['RESUMEN']);
            fputcsv($file, ['Monto Inicial:', $movimiento->monto_inicial]);
            fputcsv($file, ['Total Ingresos:', $movimiento->transacciones()->where('tipo', 'INGRESO')->sum('monto')]);
            fputcsv($file, ['Total Egresos:', $movimiento->transacciones()->where('tipo', 'EGRESO')->sum('monto')]);
            fputcsv($file, ['Monto Final:', $movimiento->monto_final]);
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Exportar kardex en PDF
     */
    public function exportarKardexPDF($productoId, Request $request)
    {
        $kardex = Kardex::where('producto_id', $productoId)
            ->with(['producto'])
            ->when($request->fecha_inicio, function($q) use ($request) {
                $q->where('fecha', '>=', $request->fecha_inicio);
            })
            ->when($request->fecha_fin, function($q) use ($request) {
                $q->where('fecha', '<=', $request->fecha_fin);
            })
            ->orderBy('fecha')
            ->get();

        $data = [
            'kardex' => $kardex,
            'producto' => $kardex->first()->producto ?? null,
            'fecha_inicio' => $request->fecha_inicio,
            'fecha_fin' => $request->fecha_fin
        ];

        $pdf = PDF::loadView('exports.kardex-pdf', $data);
        return $pdf->download('kardex-producto-' . $productoId . '.pdf');
    }

    /**
     * Exportar kardex en Excel
     */
    public function exportarKardexExcel($productoId, Request $request)
    {
        $kardex = Kardex::where('producto_id', $productoId)
            ->with(['producto'])
            ->when($request->fecha_inicio, function($q) use ($request) {
                $q->where('fecha', '>=', $request->fecha_inicio);
            })
            ->when($request->fecha_fin, function($q) use ($request) {
                $q->where('fecha', '<=', $request->fecha_fin);
            })
            ->orderBy('fecha')
            ->get();

        $producto = $kardex->first()->producto ?? null;
        $filename = 'kardex-' . ($producto ? $producto->codigo_producto : $productoId) . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($kardex, $producto) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['KARDEX DE PRODUCTO']);
            fputcsv($file, ['Producto:', $producto ? $producto->nombre : '']);
            fputcsv($file, ['Código:', $producto ? $producto->codigo_producto : '']);
            fputcsv($file, []);
            
            fputcsv($file, ['Fecha', 'Tipo Movimiento', 'Tipo Operación', 'Documento', 'Cantidad', 'Costo Unit.', 'Costo Total', 'Stock Anterior', 'Stock Actual', 'Costo Promedio']);
            
            foreach ($kardex as $k) {
                fputcsv($file, [
                    $k->fecha,
                    $k->tipo_movimiento,
                    $k->tipo_operacion,
                    $k->documento_numero,
                    $k->cantidad,
                    $k->costo_unitario,
                    $k->costo_total,
                    $k->stock_anterior,
                    $k->stock_actual,
                    $k->costo_promedio
                ]);
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Exportar cuentas por cobrar en PDF
     */
    public function exportarCxCPDF(Request $request)
    {
        $cuentas = CuentaPorCobrar::with(['cliente', 'pagos'])
            ->when($request->estado, function($q) use ($request) {
                $q->where('estado', $request->estado);
            })
            ->orderBy('fecha_vencimiento')
            ->get();

        $data = [
            'cuentas' => $cuentas,
            'total_pendiente' => $cuentas->sum('saldo_pendiente')
        ];

        $pdf = PDF::loadView('exports.cxc-pdf', $data);
        return $pdf->download('cuentas-por-cobrar-' . now()->format('Y-m-d') . '.pdf');
    }

    /**
     * Exportar cuentas por cobrar en Excel
     */
    public function exportarCxCExcel(Request $request)
    {
        $cuentas = CuentaPorCobrar::with(['cliente'])
            ->when($request->estado, function($q) use ($request) {
                $q->where('estado', $request->estado);
            })
            ->orderBy('fecha_vencimiento')
            ->get();

        $filename = 'cuentas-por-cobrar-' . now()->format('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($cuentas) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['CUENTAS POR COBRAR']);
            fputcsv($file, ['Fecha:', now()->format('Y-m-d')]);
            fputcsv($file, []);
            
            fputcsv($file, ['Cliente', 'Documento', 'Fecha Emisión', 'Fecha Vencimiento', 'Monto Total', 'Monto Pagado', 'Saldo Pendiente', 'Estado', 'Días Vencidos']);
            
            foreach ($cuentas as $cuenta) {
                fputcsv($file, [
                    $cuenta->cliente->razon_social ?? $cuenta->cliente->nombre_completo,
                    $cuenta->numero_documento,
                    $cuenta->fecha_emision,
                    $cuenta->fecha_vencimiento,
                    $cuenta->monto_total,
                    $cuenta->monto_pagado,
                    $cuenta->saldo_pendiente,
                    $cuenta->estado,
                    $cuenta->dias_vencidos
                ]);
            }
            
            fputcsv($file, []);
            fputcsv($file, ['TOTAL PENDIENTE:', $cuentas->sum('saldo_pendiente')]);
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Exportar utilidades en PDF
     */
    public function exportarUtilidadesPDF(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->toDateString();

        $ventas = Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();
        $gastos = GastoOperativo::whereBetween('fecha', [$fechaInicio, $fechaFin])->get();

        $data = [
            'fecha_inicio' => $fechaInicio,
            'fecha_fin' => $fechaFin,
            'ventas' => $ventas,
            'gastos' => $gastos,
            'total_ventas' => $ventas->sum('total'),
            'total_gastos' => $gastos->sum('monto')
        ];

        $pdf = PDF::loadView('exports.utilidades-pdf', $data);
        return $pdf->download('utilidades-' . $fechaInicio . '-' . $fechaFin . '.pdf');
    }

    /**
     * Exportar utilidades en Excel
     */
    public function exportarUtilidadesExcel(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->toDateString();

        $ventas = Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();
        $gastos = GastoOperativo::whereBetween('fecha', [$fechaInicio, $fechaFin])->get();

        $filename = 'utilidades-' . $fechaInicio . '-' . $fechaFin . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($ventas, $gastos, $fechaInicio, $fechaFin) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['REPORTE DE UTILIDADES']);
            fputcsv($file, ['Período:', $fechaInicio . ' al ' . $fechaFin]);
            fputcsv($file, []);
            
            fputcsv($file, ['VENTAS']);
            fputcsv($file, ['Fecha', 'Número', 'Cliente', 'Total']);
            foreach ($ventas as $venta) {
                fputcsv($file, [
                    $venta->created_at->format('Y-m-d'),
                    $venta->numero_venta ?? $venta->id,
                    $venta->cliente->nombre_completo ?? 'N/A',
                    $venta->total
                ]);
            }
            
            fputcsv($file, []);
            fputcsv($file, ['GASTOS OPERATIVOS']);
            fputcsv($file, ['Fecha', 'Categoría', 'Concepto', 'Monto']);
            foreach ($gastos as $gasto) {
                fputcsv($file, [
                    $gasto->fecha,
                    $gasto->categoria,
                    $gasto->concepto,
                    $gasto->monto
                ]);
            }
            
            fputcsv($file, []);
            fputcsv($file, ['RESUMEN']);
            fputcsv($file, ['Total Ventas:', $ventas->sum('total')]);
            fputcsv($file, ['Total Gastos:', $gastos->sum('monto')]);
            fputcsv($file, ['Utilidad:', $ventas->sum('total') - $gastos->sum('monto')]);
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    // ========== EXPORTACIONES TXT ==========

    /**
     * Exportar Registro de Ventas PLE en formato TXT (Formato 14.1 SUNAT)
     */
    public function exportarRegistroVentasTXT(Request $request)
    {
        try {
            $request->validate([
                'periodo' => 'required|string|size:6', // YYYYMM
                'ruc' => 'required|string|size:11'
            ]);

            $exportacionService = new ExportacionTxtService();
            $resultado = $exportacionService->exportarRegistroVentas(
                $request->periodo,
                $request->ruc
            );

            if (!$resultado['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al exportar registro de ventas',
                    'error' => $resultado['error']
                ], 500);
            }

            return response($resultado['contenido'], 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $resultado['nombre_archivo'] . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar registro de ventas TXT',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exportar Registro de Compras PLE en formato TXT (Formato 8.1 SUNAT)
     */
    public function exportarRegistroComprasTXT(Request $request)
    {
        try {
            $request->validate([
                'periodo' => 'required|string|size:6', // YYYYMM
                'ruc' => 'required|string|size:11'
            ]);

            $exportacionService = new ExportacionTxtService();
            $resultado = $exportacionService->exportarRegistroCompras(
                $request->periodo,
                $request->ruc
            );

            if (!$resultado['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al exportar registro de compras',
                    'error' => $resultado['error']
                ], 500);
            }

            return response($resultado['contenido'], 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $resultado['nombre_archivo'] . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar registro de compras TXT',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exportar reporte de ventas simple en TXT
     */
    public function exportarVentasTXT(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
            $fechaFin = $request->fecha_fin ?? now()->toDateString();

            $exportacionService = new ExportacionTxtService();
            $resultado = $exportacionService->exportarReporteVentasSimple($fechaInicio, $fechaFin);

            if (!$resultado['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al exportar reporte de ventas',
                    'error' => $resultado['error']
                ], 500);
            }

            return response($resultado['contenido'], 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $resultado['nombre_archivo'] . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar ventas TXT',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exportar kardex en TXT
     */
    public function exportarKardexTXT($productoId, Request $request)
    {
        try {
            $kardex = Kardex::where('producto_id', $productoId)
                ->with(['producto'])
                ->when($request->fecha_inicio, function($q) use ($request) {
                    $q->where('fecha', '>=', $request->fecha_inicio);
                })
                ->when($request->fecha_fin, function($q) use ($request) {
                    $q->where('fecha', '<=', $request->fecha_fin);
                })
                ->orderBy('fecha')
                ->get();

            $producto = $kardex->first()->producto ?? null;

            $lineas = [];
            $lineas[] = "KARDEX DE PRODUCTO";
            $lineas[] = "Producto: " . ($producto ? $producto->nombre : '');
            $lineas[] = "Código: " . ($producto ? $producto->codigo_producto : '');
            $lineas[] = str_repeat("=", 150);
            $lineas[] = "";

            $formato = "%-12s %-15s %-20s %-20s %10s %12s %12s %12s %12s %12s";
            $lineas[] = sprintf(
                $formato,
                "FECHA",
                "TIPO MOV",
                "TIPO OPER",
                "DOCUMENTO",
                "CANTIDAD",
                "COSTO UNIT",
                "COSTO TOTAL",
                "STOCK ANT",
                "STOCK ACT",
                "COSTO PROM"
            );
            $lineas[] = str_repeat("-", 150);

            foreach ($kardex as $k) {
                $lineas[] = sprintf(
                    $formato,
                    $k->fecha,
                    mb_substr($k->tipo_movimiento, 0, 15),
                    mb_substr($k->tipo_operacion, 0, 20),
                    mb_substr($k->documento_numero ?? '', 0, 20),
                    number_format($k->cantidad, 2),
                    number_format($k->costo_unitario, 2),
                    number_format($k->costo_total, 2),
                    number_format($k->stock_anterior, 2),
                    number_format($k->stock_actual, 2),
                    number_format($k->costo_promedio, 2)
                );
            }

            $lineas[] = str_repeat("-", 150);
            $lineas[] = "Total de movimientos: " . count($kardex);
            $lineas[] = "Generado: " . now()->format('d/m/Y H:i:s');

            $contenido = implode("\n", $lineas);
            $filename = 'kardex-' . ($producto ? $producto->codigo_producto : $productoId) . '.txt';

            return response($contenido, 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar kardex TXT',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
