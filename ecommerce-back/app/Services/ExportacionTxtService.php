<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\Compra;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ExportacionTxtService
{
    /**
     * Exportar Registro de Ventas en formato PLE 14.1 SUNAT
     */
    public function exportarRegistroVentas($periodo, $ruc)
    {
        try {
            $anio = substr($periodo, 0, 4);
            $mes = substr($periodo, 4, 2);

            $fechaInicio = Carbon::create($anio, $mes, 1)->startOfMonth();
            $fechaFin = Carbon::create($anio, $mes, 1)->endOfMonth();

            $comprobantes = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->whereIn('tipo_comprobante', ['01', '03', '07', '08']) // Factura, Boleta, NC, ND
                ->orderBy('fecha_emision')
                ->orderBy('serie')
                ->orderBy('numero')
                ->get();

            $lineas = [];
            $correlativo = 1;

            foreach ($comprobantes as $comp) {
                $linea = $this->generarLineaRegistroVentas($comp, $periodo, $correlativo);
                $lineas[] = $linea;
                $correlativo++;
            }

            $contenido = implode("\n", $lineas);
            $nombreArchivo = "LE{$ruc}{$periodo}00140100001111.txt";

            return [
                'success' => true,
                'contenido' => $contenido,
                'nombre_archivo' => $nombreArchivo,
                'total_registros' => count($lineas)
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generar línea de registro de ventas formato PLE 14.1
     */
    private function generarLineaRegistroVentas($comprobante, $periodo, $correlativo)
    {
        $campos = [
            $periodo . '00',                                    // 1. Período
            str_pad($correlativo, 10, '0', STR_PAD_LEFT),      // 2. Correlativo
            'M' . str_pad($correlativo, 9, '0', STR_PAD_LEFT), // 3. Número correlativo asiento
            $comprobante->fecha_emision->format('d/m/Y'),      // 4. Fecha emisión
            $comprobante->fecha_vencimiento ? $comprobante->fecha_vencimiento->format('d/m/Y') : '', // 5. Fecha vencimiento
            $comprobante->tipo_comprobante,                    // 6. Tipo comprobante
            $comprobante->serie,                               // 7. Serie
            str_pad($comprobante->numero, 8, '0', STR_PAD_LEFT), // 8. Número
            '',                                                // 9. Número final (rango)
            $comprobante->cliente->tipo_documento ?? '1',      // 10. Tipo documento cliente
            $comprobante->cliente->numero_documento ?? '',     // 11. Número documento cliente
            $comprobante->cliente->razon_social ?? $comprobante->cliente->nombre_completo ?? '', // 12. Razón social
            number_format($comprobante->total_exportacion, 2, '.', ''), // 13. Exportación
            number_format($comprobante->total_gravada, 2, '.', ''),     // 14. Base imponible
            number_format($comprobante->total_descuento ?? 0, 2, '.', ''), // 15. Descuento
            number_format($comprobante->total_igv, 2, '.', ''),         // 16. IGV
            '0.00',                                            // 17. Descuento IGV
            number_format($comprobante->total_exonerada, 2, '.', ''),   // 18. Exonerado
            number_format($comprobante->total_inafecta, 2, '.', ''),    // 19. Inafecto
            '0.00',                                            // 20. ISC
            '0.00',                                            // 21. Base imponible IVAP
            '0.00',                                            // 22. IVAP
            '0.00',                                            // 23. ICBPER
            '0.00',                                            // 24. Otros tributos
            number_format($comprobante->total, 2, '.', ''),    // 25. Total
            $comprobante->moneda ?? 'PEN',                     // 26. Moneda
            '1.000',                                           // 27. Tipo cambio
            $comprobante->fecha_emision->format('d/m/Y'),      // 28. Fecha emisión doc modificado
            $comprobante->nota_credito_tipo_doc ?? '',         // 29. Tipo doc modificado
            $comprobante->nota_credito_serie ?? '',            // 30. Serie doc modificado
            $comprobante->nota_credito_numero ?? '',           // 31. Número doc modificado
            '',                                                // 32. Proyecto operadores atribución
            '',                                                // 33. Tipo nota crédito/débito
            '1',                                               // 34. Estado (1=Aceptado)
        ];

        return implode('|', $campos) . '|';
    }

    /**
     * Exportar Registro de Compras en formato PLE 8.1 SUNAT
     */
    public function exportarRegistroCompras($periodo, $ruc)
    {
        try {
            $anio = substr($periodo, 0, 4);
            $mes = substr($periodo, 4, 2);

            $fechaInicio = Carbon::create($anio, $mes, 1)->startOfMonth();
            $fechaFin = Carbon::create($anio, $mes, 1)->endOfMonth();

            // Aquí deberías tener un modelo de compras con comprobantes
            // Por ahora usamos una estructura básica
            $compras = Compra::whereBetween('fecha_compra', [$fechaInicio, $fechaFin])
                ->where('numero_documento', '!=', null)
                ->orderBy('fecha_compra')
                ->get();

            $lineas = [];
            $correlativo = 1;

            foreach ($compras as $compra) {
                $linea = $this->generarLineaRegistroCompras($compra, $periodo, $correlativo);
                $lineas[] = $linea;
                $correlativo++;
            }

            $contenido = implode("\n", $lineas);
            $nombreArchivo = "LE{$ruc}{$periodo}00080100001111.txt";

            return [
                'success' => true,
                'contenido' => $contenido,
                'nombre_archivo' => $nombreArchivo,
                'total_registros' => count($lineas)
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generar línea de registro de compras formato PLE 8.1
     */
    private function generarLineaRegistroCompras($compra, $periodo, $correlativo)
    {
        $campos = [
            $periodo . '00',                                    // 1. Período
            str_pad($correlativo, 10, '0', STR_PAD_LEFT),      // 2. Correlativo
            'M' . str_pad($correlativo, 9, '0', STR_PAD_LEFT), // 3. Número correlativo asiento
            Carbon::parse($compra->fecha_compra)->format('d/m/Y'), // 4. Fecha emisión
            Carbon::parse($compra->fecha_compra)->format('d/m/Y'), // 5. Fecha vencimiento
            '01',                                              // 6. Tipo comprobante (Factura)
            'F001',                                            // 7. Serie
            $compra->numero_documento ?? '00000001',           // 8. Número
            '',                                                // 9. Número final
            '6',                                               // 10. Tipo documento proveedor (RUC)
            $compra->proveedor->numero_documento ?? '00000000000', // 11. Número documento
            $compra->proveedor->razon_social ?? 'PROVEEDOR',  // 12. Razón social
            number_format($compra->subtotal, 2, '.', ''),     // 13. Base imponible
            number_format($compra->igv, 2, '.', ''),          // 14. IGV
            '0.00',                                            // 15. Base imponible 2
            '0.00',                                            // 16. IGV 2
            '0.00',                                            // 17. Base imponible 3
            '0.00',                                            // 18. IGV 3
            '0.00',                                            // 19. Valor adquisiciones no gravadas
            '0.00',                                            // 20. ISC
            '0.00',                                            // 21. ICBPER
            '0.00',                                            // 22. Otros tributos
            number_format($compra->total, 2, '.', ''),        // 23. Total
            'PEN',                                             // 24. Moneda
            '1.000',                                           // 25. Tipo cambio
            Carbon::parse($compra->fecha_compra)->format('d/m/Y'), // 26. Fecha emisión doc modificado
            '',                                                // 27. Tipo doc modificado
            '',                                                // 28. Serie doc modificado
            '',                                                // 29. Número doc modificado
            '',                                                // 30. Proyecto operadores atribución
            '',                                                // 31. Tipo nota
            '1',                                               // 32. Estado (1=Aceptado)
        ];

        return implode('|', $campos) . '|';
    }

    /**
     * Exportar reporte simple de ventas en TXT
     */
    public function exportarReporteVentasSimple($fechaInicio, $fechaFin)
    {
        try {
            $ventas = Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])
                ->with(['cliente', 'detalles.producto'])
                ->orderBy('created_at')
                ->get();

            $lineas = [];
            $lineas[] = "REPORTE DE VENTAS";
            $lineas[] = "Período: {$fechaInicio} al {$fechaFin}";
            $lineas[] = str_repeat("=", 120);
            $lineas[] = "";

            $formato = "%-12s %-15s %-40s %12s %12s %12s";
            $lineas[] = sprintf(
                $formato,
                "FECHA",
                "DOCUMENTO",
                "CLIENTE",
                "SUBTOTAL",
                "IGV",
                "TOTAL"
            );
            $lineas[] = str_repeat("-", 120);

            $totalVentas = 0;
            $totalIGV = 0;
            $totalGeneral = 0;

            foreach ($ventas as $venta) {
                $cliente = $venta->cliente ? 
                    ($venta->cliente->razon_social ?? $venta->cliente->nombre_completo) : 
                    'CLIENTE GENERAL';

                $subtotal = $venta->total / 1.18;
                $igv = $venta->total - $subtotal;

                $lineas[] = sprintf(
                    $formato,
                    $venta->created_at->format('d/m/Y'),
                    $venta->numero_venta ?? 'V-' . $venta->id,
                    mb_substr($cliente, 0, 40),
                    number_format($subtotal, 2),
                    number_format($igv, 2),
                    number_format($venta->total, 2)
                );

                $totalVentas += $subtotal;
                $totalIGV += $igv;
                $totalGeneral += $venta->total;
            }

            $lineas[] = str_repeat("-", 120);
            $lineas[] = sprintf(
                $formato,
                "",
                "",
                "TOTALES:",
                number_format($totalVentas, 2),
                number_format($totalIGV, 2),
                number_format($totalGeneral, 2)
            );
            $lineas[] = "";
            $lineas[] = "Total de ventas: " . count($ventas);
            $lineas[] = "Generado: " . now()->format('d/m/Y H:i:s');

            $contenido = implode("\n", $lineas);
            $nombreArchivo = "ventas-{$fechaInicio}-{$fechaFin}.txt";

            return [
                'success' => true,
                'contenido' => $contenido,
                'nombre_archivo' => $nombreArchivo,
                'total_registros' => count($ventas)
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
