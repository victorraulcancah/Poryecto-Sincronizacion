<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use App\Models\NotaCredito;
use App\Models\SerieComprobante;
use App\Services\NotasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotaCreditoController extends Controller
{
    protected $notasService;

    public function __construct(NotasService $notasService)
    {
        $this->notasService = $notasService;
    }

    /**
     * Listar notas de crédito
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = NotaCredito::with(['cliente', 'venta']);

            // Filtros
            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
                $query->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->filled('serie')) {
                $query->where('serie', $request->serie);
            }

            if ($request->filled('comprobante_referencia')) {
                $search = $request->comprobante_referencia;
                $query->where(function ($q) use ($search) {
                    $q->where('serie_comprobante_ref', 'LIKE', "%{$search}%")
                        ->orWhere('numero_comprobante_ref', 'LIKE', "%{$search}%");
                });
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('numero', 'LIKE', "%{$search}%")
                        ->orWhere('serie', 'LIKE', "%{$search}%")
                        ->orWhere('motivo', 'LIKE', "%{$search}%");
                });
            }

            $notas = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json($notas);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notas de crédito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mostrar nota de crédito
     */
    public function show($id): JsonResponse
    {
        try {
            $notaCredito = NotaCredito::with(['cliente', 'venta'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $notaCredito,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Crear nota de crédito
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'comprobante_referencia_id' => 'required|exists:comprobantes,id',
                'motivo_nota' => 'required|string|max:2', // Código del catálogo SUNAT (01-10)
                'motivo_nota_descripcion' => 'required|string|max:255', // Descripción personalizada
                'motivo' => 'nullable|string|max:255', // Retrocompatibilidad
                'descripcion' => 'nullable|string|max:500',
                'items' => 'required|array|min:1',
                'items.*.producto_id' => 'nullable|exists:productos,id',
                'items.*.cantidad' => 'required|numeric|min:0.01',
                'items.*.precio_unitario' => 'required|numeric|min:0',
                'items.*.descuento' => 'nullable|numeric|min:0',
                'items.*.tipo_afectacion_igv' => 'required|string|max:2',
            ]);

            DB::beginTransaction();

            // Obtener comprobante de referencia
            $comprobanteRef = \App\Models\Comprobante::with('cliente')->findOrFail($request->comprobante_referencia_id);

            // NOTA: Permitir Notas de Crédito para Boletas temporalmente
            // Normalmente SUNAT requiere Comunicación de Baja para boletas
            // pero se permite por requerimiento especial

            if ($comprobanteRef->estado !== 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden crear notas de crédito para comprobantes aceptados',
                ], 400);
            }

            // Verificar si ya tiene nota de crédito
            $tieneNotaCredito = \App\Models\NotaCredito::where('venta_id', $comprobanteRef->venta_id)
                ->where('serie_comprobante_ref', $comprobanteRef->serie)
                ->where('numero_comprobante_ref', $comprobanteRef->correlativo)
                ->exists();

            if ($tieneNotaCredito) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este comprobante ya tiene una nota de crédito asociada',
                ], 400);
            }

            // Obtener serie para nota de crédito
            $serie = SerieComprobante::where('tipo_comprobante', '07')
                ->where('activo', true)
                ->first();

            if (!$serie) {
                throw new \Exception('No hay serie disponible para notas de crédito');
            }

            // Calcular totales
            $subtotal = 0;
            $totalIgv = 0;

            foreach ($request->items as $item) {
                $precioUnitario = $item['precio_unitario'];
                $cantidad = $item['cantidad'];
                $descuento = $item['descuento'] ?? 0;

                $subtotalItem = ($precioUnitario * $cantidad) - $descuento;
                $igvItem = $item['tipo_afectacion_igv'] === '10' ? $subtotalItem * 0.18 : 0;

                $subtotal += $subtotalItem;
                $totalIgv += $igvItem;
            }

            $total = $subtotal + $totalIgv;

            // Crear nota de crédito
            $notaCredito = NotaCredito::create([
                'serie' => $serie->serie,
                'numero' => str_pad($serie->correlativo, 8, '0', STR_PAD_LEFT),
                'serie_comprobante_ref' => $comprobanteRef->serie,
                'numero_comprobante_ref' => $comprobanteRef->correlativo,
                'tipo_comprobante_ref' => $comprobanteRef->tipo_comprobante,
                'venta_id' => $comprobanteRef->venta_id,
                'cliente_id' => $comprobanteRef->cliente_id,
                'fecha_emision' => now()->format('Y-m-d'),
                'tipo_nota_credito' => $request->motivo_nota ?? $request->motivo ?? '01', // Código SUNAT (01-10)
                'motivo' => $request->motivo_nota_descripcion ?? $request->motivo ?? 'Anulación de operación', // Descripción
                'subtotal' => $subtotal,
                'igv' => $totalIgv,
                'total' => $total,
                'moneda' => 'PEN',
                'estado' => 'pendiente', // Estado inicial: PENDIENTE (sin XML)
                'observaciones' => $request->descripcion,
            ]);

            // Actualizar correlativo de la serie
            $serie->increment('correlativo');

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $notaCredito->fresh(),
                'message' => 'Nota de crédito creada exitosamente. Use el botón "Generar XML" para continuar.',
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear nota de crédito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generar XML de nota de crédito (sin enviar a SUNAT)
     */
    public function generarXml($id): JsonResponse
    {
        try {
            $notaCredito = NotaCredito::with(['cliente', 'venta'])->findOrFail($id);

            // Validar que esté en estado pendiente
            if ($notaCredito->estado !== 'pendiente') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se puede generar XML para notas en estado PENDIENTE. Estado actual: ' . $notaCredito->estado,
                ], 400);
            }

            // Generar XML usando el servicio (sin enviar a SUNAT)
            $resultado = $this->notasService->generarXmlNotaCredito($id);

            if ($resultado['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'XML generado exitosamente. Ahora puede enviar a SUNAT.',
                    'data' => $resultado['data'],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $resultado['message'],
                    'error' => $resultado['error'] ?? null,
                ], 400);
            }

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar XML',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar nota de crédito a SUNAT
     */
    public function enviarSunat($id): JsonResponse
    {
        try {
            $notaCredito = NotaCredito::with(['cliente', 'venta'])->findOrFail($id);

            // NOTA: Permitir envío de Notas de Crédito para Boletas
            // Normalmente SUNAT requiere Comunicación de Baja para boletas

            // Validar que el XML esté generado
            if (!$notaCredito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe generar el XML antes de enviar a SUNAT. Use el botón "Generar XML".',
                ], 400);
            }

            // Validar estados permitidos para envío
            $estadosPermitidos = ['pendiente', 'generado', 'rechazado'];
            if (!in_array($notaCredito->estado, $estadosPermitidos)) {
                return response()->json([
                    'success' => false,
                    'message' => "No se puede enviar la nota en estado '{$notaCredito->estado}'. Estados permitidos: pendiente, generado, rechazado",
                ], 400);
            }

            // Enviar a SUNAT usando el servicio
            $resultado = $this->notasService->enviarNotaCreditoASunat($id);

            if ($resultado['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $resultado['message'],
                    'data' => $resultado['data'],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $resultado['message'],
                    'error' => $resultado['error'] ?? null,
                    'codigo_error' => $resultado['codigo_error'] ?? null,
                ], 400);
            }

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar nota de crédito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de notas de crédito
     */
    public function estadisticas(Request $request): JsonResponse
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $totalNotas = NotaCredito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->count();
            $montoTotal = NotaCredito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->sum('total');

            $estadisticasPorEstado = NotaCredito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->selectRaw('estado, COUNT(*) as cantidad, SUM(total) as monto')
                ->groupBy('estado')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_notas' => $totalNotas,
                    'monto_total' => $montoTotal,
                    'por_estado' => $estadisticasPorEstado,
                    'periodo' => ['inicio' => $fechaInicio, 'fin' => $fechaFin],
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar PDF de nota de crédito
     */
    public function descargarPdf($id)
    {
        try {
            $notaCredito = NotaCredito::findOrFail($id);

            if (!$notaCredito->pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF no disponible',
                ], 404);
            }

            $pdf = base64_decode($notaCredito->pdf);
            $filename = 'NC-' . $notaCredito->serie . '-' . $notaCredito->numero . '.pdf';

            return response($pdf, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="' . $filename . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar PDF',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar XML de nota de crédito
     */
    public function descargarXml($id)
    {
        try {
            $notaCredito = NotaCredito::findOrFail($id);

            if (! $notaCredito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible',
                ], 404);
            }

            $xml = $notaCredito->xml;
            $filename = 'NC-'.$notaCredito->serie.'-'.$notaCredito->numero.'.xml';

            return response($xml, 200)
                ->header('Content-Type', 'application/xml')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar XML',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar CDR de nota de crédito
     */
    public function descargarCdr($id)
    {
        try {
            $notaCredito = NotaCredito::findOrFail($id);

            if (! $notaCredito->cdr) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible',
                ], 404);
            }

            // El CDR es un archivo ZIP, devolverlo directamente
            $cdrZip = base64_decode($notaCredito->cdr);
            $filename = 'R-NC-'.$notaCredito->serie.'-'.$notaCredito->numero.'.zip';

            return response($cdrZip, 200)
                ->header('Content-Type', 'application/zip')
                ->header('Content-Disposition', 'inline; filename="'.$filename.'"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar CDR',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar PDF público (sin autenticación - para WhatsApp)
     * URL: /api/nota-credito/pdf/{notaId}/{numeroCompleto}
     */
    public function descargarPdfPublico($notaId, $numeroCompleto)
    {
        try {
            $nota = NotaCredito::findOrFail($notaId);

            // Validar número completo (seguridad)
            $numeroEsperado = $nota->serie . '-' . $nota->numero;
            if ($numeroCompleto !== $numeroEsperado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Número de nota no válido',
                ], 403);
            }

            if (!$nota->pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF no disponible',
                ], 404);
            }

            $pdf = base64_decode($nota->pdf);
            $filename = 'NC-' . $nota->serie . '-' . $nota->numero . '.pdf';

            return response($pdf, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="' . $filename . '"')
                ->header('Cache-Control', 'public, max-age=3600');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar PDF',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar XML público (sin autenticación - para WhatsApp)
     * URL: /api/nota-credito/xml/{notaId}/{numeroCompleto}
     */
    public function descargarXmlPublico($notaId, $numeroCompleto)
    {
        try {
            $nota = NotaCredito::findOrFail($notaId);

            // Validar número completo (seguridad)
            $numeroEsperado = $nota->serie . '-' . $nota->numero;
            if ($numeroCompleto !== $numeroEsperado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Número de nota no válido',
                ], 403);
            }

            if (!$nota->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible',
                ], 404);
            }

            $filename = 'NC-' . $nota->serie . '-' . $nota->numero . '.xml';

            return response($nota->xml, 200)
                ->header('Content-Type', 'application/xml')
                ->header('Content-Disposition', 'inline; filename="' . $filename . '"')
                ->header('Cache-Control', 'public, max-age=3600');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar XML',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar CDR público (sin autenticación - para WhatsApp)
     * URL: /api/nota-credito/cdr/{notaId}/{numeroCompleto}
     */
    public function descargarCdrPublico($notaId, $numeroCompleto)
    {
        try {
            $nota = NotaCredito::findOrFail($notaId);

            // Validar número completo (seguridad)
            $numeroEsperado = $nota->serie . '-' . $nota->numero;
            if ($numeroCompleto !== $numeroEsperado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Número de nota no válido',
                ], 403);
            }

            if (!$nota->cdr) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible',
                ], 404);
            }

            // El CDR es un archivo ZIP que contiene el XML de respuesta de SUNAT
            // Por ahora, devolver el ZIP directamente para descarga
            $cdrZip = base64_decode($nota->cdr);
            
            if (!$cdrZip || strlen($cdrZip) === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible o corrupto',
                ], 404);
            }

            $filename = 'R-NC-' . $nota->serie . '-' . $nota->numero . '.zip';

            return response($cdrZip, 200)
                ->header('Content-Type', 'application/zip')
                ->header('Content-Disposition', 'inline; filename="' . $filename . '"')
                ->header('Cache-Control', 'public, max-age=3600');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar CDR',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar nota de crédito (solo si está en estado PENDIENTE)
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $notaCredito = NotaCredito::findOrFail($id);

            // Validar que esté en estado pendiente
            if ($notaCredito->estado !== 'pendiente') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden editar notas en estado PENDIENTE. Estado actual: ' . $notaCredito->estado,
                ], 400);
            }

            // Validar datos
            $request->validate([
                'motivo' => 'sometimes|string|max:255',
                'descripcion' => 'nullable|string|max:500',
                'items' => 'sometimes|array|min:1',
                'items.*.producto_id' => 'nullable|exists:productos,id',
                'items.*.cantidad' => 'required_with:items|numeric|min:0.01',
                'items.*.precio_unitario' => 'required_with:items|numeric|min:0',
                'items.*.descuento' => 'nullable|numeric|min:0',
                'items.*.tipo_afectacion_igv' => 'required_with:items|string|max:2',
            ]);

            DB::beginTransaction();

            // Si se actualizan items, recalcular totales
            if ($request->has('items')) {
                $subtotal = 0;
                $totalIgv = 0;

                foreach ($request->items as $item) {
                    $precioUnitario = $item['precio_unitario'];
                    $cantidad = $item['cantidad'];
                    $descuento = $item['descuento'] ?? 0;

                    $subtotalItem = ($precioUnitario * $cantidad) - $descuento;
                    $igvItem = $item['tipo_afectacion_igv'] === '10' ? $subtotalItem * 0.18 : 0;

                    $subtotal += $subtotalItem;
                    $totalIgv += $igvItem;
                }

                $total = $subtotal + $totalIgv;

                $notaCredito->update([
                    'subtotal' => $subtotal,
                    'igv' => $totalIgv,
                    'total' => $total,
                ]);
            }

            // Actualizar otros campos
            $notaCredito->update($request->only(['motivo', 'observaciones']));

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $notaCredito->fresh(),
                'message' => 'Nota de crédito actualizada exitosamente',
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar nota de crédito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar nota de crédito por WhatsApp
     */
    public function enviarWhatsApp(Request $request, $id): JsonResponse
    {
        try {
            $notaCredito = NotaCredito::with(['cliente'])->findOrFail($id);

            // Validar que tenga XML generado
            if (!$notaCredito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe generar el XML antes de enviar por WhatsApp',
                ], 400);
            }

            $request->validate([
                'telefono' => 'required|string|max:20',
                'mensaje' => 'nullable|string|max:500',
            ]);

            $telefono = $request->telefono;
            $numeroCompleto = $notaCredito->serie . '-' . $notaCredito->numero;
            
            // Generar URLs públicas
            $pdfUrl = url("/api/nota-credito/pdf/{$notaCredito->id}/{$numeroCompleto}");
            $xmlUrl = url("/api/nota-credito/xml/{$notaCredito->id}/{$numeroCompleto}");
            $cdrUrl = $notaCredito->cdr ? url("/api/nota-credito/cdr/{$notaCredito->id}/{$numeroCompleto}") : null;

            $mensaje = $request->mensaje ?? "Nota de Crédito {$numeroCompleto}\n\nPDF: {$pdfUrl}\nXML: {$xmlUrl}";
            if ($cdrUrl) {
                $mensaje .= "\nCDR: {$cdrUrl}";
            }

            // Aquí integrarías con tu servicio de WhatsApp
            // Por ahora solo devolvemos la información
            
            return response()->json([
                'success' => true,
                'message' => 'Información preparada para envío por WhatsApp',
                'data' => [
                    'telefono' => $telefono,
                    'mensaje' => $mensaje,
                    'urls' => [
                        'pdf' => $pdfUrl,
                        'xml' => $xmlUrl,
                        'cdr' => $cdrUrl,
                    ],
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al preparar envío por WhatsApp',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar nota de crédito por Email
     */
    public function enviarEmail(Request $request, $id): JsonResponse
    {
        try {
            $request->validate([
                'email' => 'required|email|max:255',
                'mensaje' => 'nullable|string|max:1000',
            ]);

            $notaCredito = NotaCredito::with(['cliente', 'venta'])->findOrFail($id);

            // Validar que tenga XML generado
            if (!$notaCredito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe generar el XML antes de enviar por Email',
                ], 400);
            }

            // Validar que tenga PDF
            if (!$notaCredito->pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'La nota no tiene PDF generado',
                ], 400);
            }

            // Validar que esté aceptada
            if ($notaCredito->estado !== 'aceptado') {
                return response()->json([
                    'success' => false,
                    'message' => 'La nota debe estar aceptada por SUNAT antes de enviarla',
                    'data' => [
                        'estado_actual' => $notaCredito->estado,
                    ],
                ], 400);
            }

            $numeroCompleto = $notaCredito->serie . '-' . $notaCredito->numero;
            
            // Obtener nombre del cliente
            $nombreCliente = $notaCredito->cliente->razon_social ?? $notaCredito->cliente->nombre_comercial ?? 'Cliente';

            // Mensaje personalizado
            $mensajeTexto = $request->mensaje ?? "Estimado(a) {$nombreCliente}, adjuntamos su Nota de Crédito {$numeroCompleto}.";

            try {
                // Enviar email con la nota adjunta
                \Illuminate\Support\Facades\Mail::to($request->email)->send(
                    new \App\Mail\NotaCreditoEmail($notaCredito, $mensajeTexto)
                );

                \Illuminate\Support\Facades\Log::info('Email de Nota de Crédito enviado exitosamente', [
                    'nota_credito_id' => $notaCredito->id,
                    'email' => $request->email,
                    'numero' => $numeroCompleto,
                ]);

                // Registrar envío exitoso
                try {
                    \App\Models\NotificacionEnviada::registrarEnvio(
                        $notaCredito->venta_id,
                        'email',
                        $request->email,
                        $mensajeTexto,
                        null,
                        'nota_credito',
                        $notaCredito->id
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('No se pudo registrar el envío de email', [
                        'error' => $e->getMessage(),
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Nota de Crédito enviada por email exitosamente',
                    'data' => [
                        'email' => $request->email,
                        'numero' => $numeroCompleto,
                        'fecha_envio' => now()->format('Y-m-d H:i:s'),
                    ],
                ]);

            } catch (\Exception $mailError) {
                \Illuminate\Support\Facades\Log::error('Error al enviar email de Nota de Crédito', [
                    'nota_credito_id' => $notaCredito->id,
                    'error' => $mailError->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Error al enviar el email',
                    'error' => $mailError->getMessage(),
                ], 500);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar por Email',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Consultar estado de nota de crédito en SUNAT
     */
    public function consultarSunat($id): JsonResponse
    {
        try {
            $notaCredito = NotaCredito::findOrFail($id);

            // Validar que tenga XML generado
            if (!$notaCredito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'La nota no tiene XML generado para consultar',
                ], 400);
            }

            // Consultar estado en SUNAT
            $resultado = $this->notasService->consultarEstadoNotaCredito($id);

            return response()->json($resultado);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de crédito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al consultar estado en SUNAT',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
