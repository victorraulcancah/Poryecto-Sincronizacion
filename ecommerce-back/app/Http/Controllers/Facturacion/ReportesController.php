<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Comprobante;
use App\Models\NotaCredito;
use App\Models\NotaDebito;
use App\Models\Pago;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ReportesController extends Controller
{
    /**
     * Reporte de ventas por período
     */
    public function reporteVentas(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');
            $tipoComprobante = $request->tipo_comprobante; // 01: Factura, 03: Boleta

            $query = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->whereIn('estado', ['ACEPTADO', 'PENDIENTE']);

            if ($tipoComprobante) {
                $query->where('tipo_comprobante', $tipoComprobante);
            }

            $comprobantes = $query->with(['cliente', 'detalles.producto'])->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_comprobantes' => $comprobantes->count(),
                    'total_facturas' => $comprobantes->where('tipo_comprobante', '01')->count(),
                    'total_boletas' => $comprobantes->where('tipo_comprobante', '03')->count(),
                    'operaciones_gravadas' => $comprobantes->sum('operacion_gravada'),
                    'total_igv' => $comprobantes->sum('total_igv'),
                    'importe_total' => $comprobantes->sum('importe_total'),
                ],
                'por_tipo' => [
                    'facturas' => [
                        'cantidad' => $comprobantes->where('tipo_comprobante', '01')->count(),
                        'monto' => $comprobantes->where('tipo_comprobante', '01')->sum('importe_total')
                    ],
                    'boletas' => [
                        'cantidad' => $comprobantes->where('tipo_comprobante', '03')->count(),
                        'monto' => $comprobantes->where('tipo_comprobante', '03')->sum('importe_total')
                    ]
                ],
                'por_mes' => $comprobantes->groupBy(function ($comprobante) {
                    return Carbon::parse($comprobante->fecha_emision)->format('Y-m');
                })->map(function ($grupo) {
                    return [
                        'cantidad' => $grupo->count(),
                        'monto' => $grupo->sum('importe_total')
                    ];
                }),
                'top_clientes' => $comprobantes->groupBy('cliente_id')->map(function ($grupo) {
                    return [
                        'cliente' => $grupo->first()->cliente->razon_social ?? 'Sin cliente',
                        'documento' => $grupo->first()->cliente->numero_documento ?? '',
                        'cantidad_compras' => $grupo->count(),
                        'monto_total' => $grupo->sum('importe_total')
                    ];
                })->sortByDesc('monto_total')->take(10)->values(),
                'productos_mas_vendidos' => $this->obtenerProductosMasVendidos($fechaInicio, $fechaFin)
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte de ventas: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte de ventas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reporte de anulaciones
     */
    public function reporteAnulaciones(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $comprobantesAnulados = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->where('estado', 'ANULADO')
                ->with(['cliente', 'user'])
                ->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_anulaciones' => $comprobantesAnulados->count(),
                    'monto_anulado' => $comprobantesAnulados->sum('importe_total'),
                    'por_tipo' => [
                        'facturas' => $comprobantesAnulados->where('tipo_comprobante', '01')->count(),
                        'boletas' => $comprobantesAnulados->where('tipo_comprobante', '03')->count()
                    ]
                ],
                'detalle' => $comprobantesAnulados->map(function ($comprobante) {
                    return [
                        'id' => $comprobante->id,
                        'tipo' => $comprobante->tipo_comprobante === '01' ? 'Factura' : 'Boleta',
                        'numero' => $comprobante->serie . '-' . $comprobante->correlativo,
                        'fecha_emision' => $comprobante->fecha_emision,
                        'cliente' => $comprobante->cliente_razon_social,
                        'monto' => $comprobante->importe_total,
                        'motivo' => $comprobante->observaciones,
                        'usuario' => $comprobante->user->name ?? 'Sistema'
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte de anulaciones: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte de anulaciones',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reporte de impuestos (IGV)
     */
    public function reporteImpuestos(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $comprobantes = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])
                ->get();

            $notasCredito = NotaCredito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->where('estado', 'ACEPTADO')
                ->get();

            $notasDebito = NotaDebito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->where('estado', 'ACEPTADO')
                ->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'ventas' => [
                    'operaciones_gravadas' => $comprobantes->sum('operacion_gravada'),
                    'operaciones_exoneradas' => $comprobantes->sum('operacion_exonerada'),
                    'operaciones_inafectas' => $comprobantes->sum('operacion_inafecta'),
                    'igv' => $comprobantes->sum('total_igv'),
                    'total' => $comprobantes->sum('importe_total')
                ],
                'notas_credito' => [
                    'cantidad' => $notasCredito->count(),
                    'base_imponible' => $notasCredito->sum('base_imponible'),
                    'igv' => $notasCredito->sum('igv'),
                    'total' => $notasCredito->sum('total')
                ],
                'notas_debito' => [
                    'cantidad' => $notasDebito->count(),
                    'base_imponible' => $notasDebito->sum('base_imponible'),
                    'igv' => $notasDebito->sum('igv'),
                    'total' => $notasDebito->sum('total')
                ],
                'resumen_tributario' => [
                    'base_imponible_neta' => $comprobantes->sum('operacion_gravada') - $notasCredito->sum('base_imponible') + $notasDebito->sum('base_imponible'),
                    'igv_neto' => $comprobantes->sum('total_igv') - $notasCredito->sum('igv') + $notasDebito->sum('igv'),
                    'total_neto' => $comprobantes->sum('importe_total') - $notasCredito->sum('total') + $notasDebito->sum('total')
                ],
                'por_mes' => $comprobantes->groupBy(function ($comprobante) {
                    return Carbon::parse($comprobante->fecha_emision)->format('Y-m');
                })->map(function ($grupo) {
                    return [
                        'base_imponible' => $grupo->sum('operacion_gravada'),
                        'igv' => $grupo->sum('total_igv'),
                        'total' => $grupo->sum('importe_total')
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte de impuestos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte de impuestos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reporte de notas de crédito
     */
    public function reporteNotasCredito(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $notasCredito = NotaCredito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->with(['comprobanteReferencia', 'cliente'])
                ->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_notas' => $notasCredito->count(),
                    'monto_total' => $notasCredito->sum('total'),
                    'por_estado' => [
                        'aceptadas' => $notasCredito->where('estado', 'ACEPTADO')->count(),
                        'pendientes' => $notasCredito->where('estado', 'PENDIENTE')->count(),
                        'rechazadas' => $notasCredito->where('estado', 'RECHAZADO')->count()
                    ],
                    'por_motivo' => $notasCredito->groupBy('motivo')->map(function ($grupo) {
                        return [
                            'cantidad' => $grupo->count(),
                            'monto' => $grupo->sum('total')
                        ];
                    })
                ],
                'detalle' => $notasCredito->map(function ($nota) {
                    return [
                        'id' => $nota->id,
                        'numero' => $nota->serie . '-' . $nota->correlativo,
                        'fecha_emision' => $nota->fecha_emision,
                        'cliente' => $nota->cliente->razon_social ?? 'Sin cliente',
                        'comprobante_referencia' => $nota->comprobanteReferencia ?
                            $nota->comprobanteReferencia->serie . '-' . $nota->comprobanteReferencia->correlativo :
                            'Sin referencia',
                        'motivo' => $nota->motivo_descripcion,
                        'monto' => $nota->total,
                        'estado' => $nota->estado
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte de notas de crédito: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte de notas de crédito',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reporte de notas de débito
     */
    public function reporteNotasDebito(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $notasDebito = NotaDebito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->with(['comprobanteReferencia', 'cliente'])
                ->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_notas' => $notasDebito->count(),
                    'monto_total' => $notasDebito->sum('total'),
                    'por_estado' => [
                        'aceptadas' => $notasDebito->where('estado', 'ACEPTADO')->count(),
                        'pendientes' => $notasDebito->where('estado', 'PENDIENTE')->count(),
                        'rechazadas' => $notasDebito->where('estado', 'RECHAZADO')->count()
                    ],
                    'por_motivo' => $notasDebito->groupBy('motivo')->map(function ($grupo) {
                        return [
                            'cantidad' => $grupo->count(),
                            'monto' => $grupo->sum('total')
                        ];
                    })
                ],
                'detalle' => $notasDebito->map(function ($nota) {
                    return [
                        'id' => $nota->id,
                        'numero' => $nota->serie . '-' . $nota->correlativo,
                        'fecha_emision' => $nota->fecha_emision,
                        'cliente' => $nota->cliente->razon_social ?? 'Sin cliente',
                        'comprobante_referencia' => $nota->comprobanteReferencia ?
                            $nota->comprobanteReferencia->serie . '-' . $nota->comprobanteReferencia->correlativo :
                            'Sin referencia',
                        'motivo' => $nota->motivo_descripcion,
                        'monto' => $nota->total,
                        'estado' => $nota->estado
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte de notas de débito: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte de notas de débito',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reporte de pagos
     */
    public function reportePagos(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $pagos = Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])
                ->with(['comprobante'])
                ->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_pagos' => $pagos->where('estado', 'completado')->count(),
                    'monto_total' => $pagos->where('estado', 'completado')->sum('monto'),
                    'por_metodo' => $pagos->where('estado', 'completado')->groupBy('metodo_pago')->map(function ($grupo) {
                        return [
                            'cantidad' => $grupo->count(),
                            'monto' => $grupo->sum('monto')
                        ];
                    }),
                    'por_estado' => $pagos->groupBy('estado')->map(function ($grupo) {
                        return [
                            'cantidad' => $grupo->count(),
                            'monto' => $grupo->sum('monto')
                        ];
                    })
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte de pagos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte de pagos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reporte consolidado (dashboard)
     */
    public function reporteConsolidado(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $comprobantes = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->get();
            $pagos = Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])->get();

            $reporte = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'ventas' => [
                    'total_comprobantes' => $comprobantes->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])->count(),
                    'monto_total' => $comprobantes->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])->sum('importe_total'),
                    'facturas' => $comprobantes->where('tipo_comprobante', '01')->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])->count(),
                    'boletas' => $comprobantes->where('tipo_comprobante', '03')->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])->count()
                ],
                'pagos' => [
                    'total_cobrado' => $pagos->where('estado', 'completado')->sum('monto'),
                    'total_pagos' => $pagos->where('estado', 'completado')->count()
                ],
                'anulaciones' => [
                    'total' => $comprobantes->where('estado', 'ANULADO')->count(),
                    'monto' => $comprobantes->where('estado', 'ANULADO')->sum('importe_total')
                ],
                'impuestos' => [
                    'base_imponible' => $comprobantes->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])->sum('operacion_gravada'),
                    'igv' => $comprobantes->whereIn('estado', ['ACEPTADO', 'PENDIENTE'])->sum('total_igv')
                ],
                'estados_sunat' => [
                    'aceptados' => $comprobantes->where('estado', 'ACEPTADO')->count(),
                    'pendientes' => $comprobantes->where('estado', 'PENDIENTE')->count(),
                    'rechazados' => $comprobantes->where('estado', 'RECHAZADO')->count()
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $reporte
            ]);

        } catch (\Exception $e) {
            Log::error('Error en reporte consolidado: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al generar reporte consolidado',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Método auxiliar para obtener productos más vendidos
     */
    private function obtenerProductosMasVendidos($fechaInicio, $fechaFin)
    {
        try {
            $productos = DB::table('comprobante_detalles')
                ->join('comprobantes', 'comprobante_detalles.comprobante_id', '=', 'comprobantes.id')
                ->join('productos', 'comprobante_detalles.producto_id', '=', 'productos.id')
                ->whereBetween('comprobantes.fecha_emision', [$fechaInicio, $fechaFin])
                ->whereIn('comprobantes.estado', ['ACEPTADO', 'PENDIENTE'])
                ->select(
                    'productos.nombre',
                    'productos.codigo_producto',
                    DB::raw('SUM(comprobante_detalles.cantidad) as cantidad_vendida'),
                    DB::raw('SUM(comprobante_detalles.importe_total) as monto_total')
                )
                ->groupBy('productos.id', 'productos.nombre', 'productos.codigo_producto')
                ->orderByDesc('cantidad_vendida')
                ->limit(10)
                ->get();

            return $productos;
        } catch (\Exception $e) {
            Log::error('Error al obtener productos más vendidos: ' . $e->getMessage());
            return [];
        }
    }
}
