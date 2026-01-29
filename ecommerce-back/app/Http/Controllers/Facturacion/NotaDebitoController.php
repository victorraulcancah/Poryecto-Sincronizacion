<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use App\Models\NotaDebito;
use App\Models\SerieComprobante;
use App\Services\NotasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotaDebitoController extends Controller
{
    protected $notasService;

    public function __construct(NotasService $notasService)
    {
        $this->notasService = $notasService;
    }

    /**
     * Listar notas de débito
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = NotaDebito::with(['cliente', 'venta']);

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
                'message' => 'Error al obtener notas de débito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mostrar nota de débito
     */
    public function show($id): JsonResponse
    {
        try {
            $notaDebito = NotaDebito::with(['cliente', 'venta'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $notaDebito,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de débito no encontrada',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Crear nota de débito
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'comprobante_referencia_id' => 'required|exists:comprobantes,id',
                'motivo_nota' => 'required|string|max:2', // Código del catálogo SUNAT (01-03)
                'motivo_nota_descripcion' => 'required|string|max:255', // Descripción personalizada
                'motivo' => 'nullable|string|max:255', // Retrocompatibilidad
                'descripcion' => 'nullable|string|max:500',
                'items' => 'required|array|min:1',
                'items.*.concepto' => 'required|string|max:255',
                'items.*.cantidad' => 'required|numeric|min:0.01',
                'items.*.precio_unitario' => 'required|numeric|min:0',
                'items.*.tipo_afectacion_igv' => 'required|string|max:2',
            ]);

            DB::beginTransaction();

            // Obtener comprobante de referencia
            $comprobanteRef = \App\Models\Comprobante::with('cliente')->findOrFail($request->comprobante_referencia_id);

            // Validar que el comprobante esté aceptado
            if ($comprobanteRef->estado !== 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden crear notas de débito para comprobantes aceptados',
                ], 400);
            }

            // Obtener serie para nota de débito
            $serie = SerieComprobante::where('tipo_comprobante', '08')
                ->where('activo', true)
                ->first();

            if (! $serie) {
                throw new \Exception('No hay serie disponible para notas de débito');
            }

            // Calcular totales
            $subtotal = 0;
            $totalIgv = 0;

            foreach ($request->items as $item) {
                $precioUnitario = $item['precio_unitario'];
                $cantidad = $item['cantidad'];

                $subtotalItem = $precioUnitario * $cantidad;
                $igvItem = $item['tipo_afectacion_igv'] === '10' ? $subtotalItem * 0.18 : 0;

                $subtotal += $subtotalItem;
                $totalIgv += $igvItem;
            }

            $total = $subtotal + $totalIgv;

            // Incrementar correlativo ANTES de crear la nota
            $serie->increment('correlativo');
            
            // Crear nota de débito
            $notaDebito = NotaDebito::create([
                'serie' => $serie->serie,
                'numero' => str_pad($serie->correlativo, 8, '0', STR_PAD_LEFT),
                'serie_comprobante_ref' => $comprobanteRef->serie,
                'numero_comprobante_ref' => $comprobanteRef->correlativo,
                'tipo_comprobante_ref' => $comprobanteRef->tipo_comprobante,
                'venta_id' => $comprobanteRef->venta_id,
                'cliente_id' => $comprobanteRef->cliente_id,
                'fecha_emision' => now()->format('Y-m-d'),
                'tipo_nota_debito' => $request->motivo_nota ?? $request->motivo ?? '01', // Código SUNAT (01-03)
                'motivo' => $request->motivo_nota_descripcion ?? $request->motivo ?? 'Intereses por mora', // Descripción
                'subtotal' => $subtotal,
                'igv' => $totalIgv,
                'total' => $total,
                'moneda' => 'PEN',
                'estado' => 'pendiente', // Estado inicial: PENDIENTE (sin XML)
                'observaciones' => $request->descripcion,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $notaDebito->fresh(),
                'message' => 'Nota de débito creada exitosamente. Use el botón "Generar XML" para continuar.',
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
                'message' => 'Error al crear nota de débito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generar XML de nota de débito (sin enviar a SUNAT)
     */
    public function generarXml($id): JsonResponse
    {
        try {
            $notaDebito = NotaDebito::with(['cliente', 'venta'])->findOrFail($id);

            // Validar que esté en estado pendiente
            if ($notaDebito->estado !== 'pendiente') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se puede generar XML para notas en estado PENDIENTE. Estado actual: '.$notaDebito->estado,
                ], 400);
            }

            // Generar XML usando el servicio (sin enviar a SUNAT)
            $resultado = $this->notasService->generarXmlNotaDebito($id);

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
                'message' => 'Nota de débito no encontrada',
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
     * Enviar nota de débito a SUNAT
     */
    public function enviarSunat($id): JsonResponse
    {
        try {
            $notaDebito = NotaDebito::with(['cliente', 'venta'])->findOrFail($id);

            // Validar que el XML esté generado
            if (! $notaDebito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe generar el XML antes de enviar a SUNAT. Use el botón "Generar XML".',
                ], 400);
            }

            // Validar estados permitidos para envío
            $estadosPermitidos = ['pendiente', 'generado', 'rechazado'];
            if (! in_array($notaDebito->estado, $estadosPermitidos)) {
                return response()->json([
                    'success' => false,
                    'message' => "No se puede enviar la nota en estado '{$notaDebito->estado}'. Estados permitidos: pendiente, generado, rechazado",
                ], 400);
            }

            // Enviar a SUNAT usando el servicio
            $resultado = $this->notasService->enviarNotaDebitoASunat($id);

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
                'message' => 'Nota de débito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar nota de débito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de notas de débito
     */
    public function estadisticas(Request $request): JsonResponse
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $totalNotas = NotaDebito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->count();
            $montoTotal = NotaDebito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->sum('total');

            $estadisticasPorEstado = NotaDebito::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
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
     * Descargar PDF de nota de débito
     */
    public function descargarPdf($id)
    {
        try {
            $notaDebito = NotaDebito::findOrFail($id);

            if (! $notaDebito->pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF no disponible',
                ], 404);
            }

            $pdf = base64_decode($notaDebito->pdf);
            $filename = 'ND-'.$notaDebito->serie.'-'.$notaDebito->numero.'.pdf';

            return response($pdf, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="'.$filename.'"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar PDF',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Descargar XML de nota de débito
     */
    public function descargarXml($id)
    {
        try {
            $notaDebito = NotaDebito::findOrFail($id);

            if (! $notaDebito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible',
                ], 404);
            }

            $xml = $notaDebito->xml;
            $filename = 'ND-'.$notaDebito->serie.'-'.$notaDebito->numero.'.xml';

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
     * Descargar CDR de nota de débito
     */
    public function descargarCdr($id)
    {
        try {
            $notaDebito = NotaDebito::findOrFail($id);

            if (! $notaDebito->cdr) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible',
                ], 404);
            }

            // El CDR es un archivo ZIP, devolverlo directamente
            $cdrZip = base64_decode($notaDebito->cdr);
            $filename = 'R-ND-'.$notaDebito->serie.'-'.$notaDebito->numero.'.zip';

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
     * URL: /api/nota-debito/pdf/{notaId}/{numeroCompleto}
     */
    public function descargarPdfPublico($notaId, $numeroCompleto)
    {
        try {
            $nota = NotaDebito::findOrFail($notaId);

            // Validar número completo (seguridad)
            $numeroEsperado = $nota->serie.'-'.$nota->numero;
            if ($numeroCompleto !== $numeroEsperado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Número de nota no válido',
                ], 403);
            }

            if (! $nota->pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF no disponible',
                ], 404);
            }

            $pdf = base64_decode($nota->pdf);
            $filename = 'ND-'.$nota->serie.'-'.$nota->numero.'.pdf';

            return response($pdf, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="'.$filename.'"')
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
     * URL: /api/nota-debito/xml/{notaId}/{numeroCompleto}
     */
    public function descargarXmlPublico($notaId, $numeroCompleto)
    {
        try {
            $nota = NotaDebito::findOrFail($notaId);

            // Validar número completo (seguridad)
            $numeroEsperado = $nota->serie.'-'.$nota->numero;
            if ($numeroCompleto !== $numeroEsperado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Número de nota no válido',
                ], 403);
            }

            if (! $nota->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible',
                ], 404);
            }

            $filename = 'ND-'.$nota->serie.'-'.$nota->numero.'.xml';

            return response($nota->xml, 200)
                ->header('Content-Type', 'application/xml')
                ->header('Content-Disposition', 'inline; filename="'.$filename.'"')
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
     * URL: /api/nota-debito/cdr/{notaId}/{numeroCompleto}
     */
    public function descargarCdrPublico($notaId, $numeroCompleto)
    {
        try {
            $nota = NotaDebito::findOrFail($notaId);

            // Validar número completo (seguridad)
            $numeroEsperado = $nota->serie.'-'.$nota->numero;
            if ($numeroCompleto !== $numeroEsperado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Número de nota no válido',
                ], 403);
            }

            if (! $nota->cdr) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible',
                ], 404);
            }

            // El CDR es un archivo ZIP que contiene el XML de respuesta de SUNAT
            // Por ahora, devolver el ZIP directamente para descarga
            $cdrZip = base64_decode($nota->cdr);

            if (! $cdrZip || strlen($cdrZip) === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible o corrupto',
                ], 404);
            }

            $filename = 'R-ND-'.$nota->serie.'-'.$nota->numero.'.zip';

            return response($cdrZip, 200)
                ->header('Content-Type', 'application/zip')
                ->header('Content-Disposition', 'inline; filename="'.$filename.'"')
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
     * Actualizar nota de débito (solo si está en estado PENDIENTE)
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $notaDebito = NotaDebito::findOrFail($id);

            // Validar que esté en estado pendiente
            if ($notaDebito->estado !== 'pendiente') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden editar notas en estado PENDIENTE. Estado actual: '.$notaDebito->estado,
                ], 400);
            }

            // Validar datos
            $request->validate([
                'motivo' => 'sometimes|string|max:255',
                'descripcion' => 'nullable|string|max:500',
                'items' => 'sometimes|array|min:1',
                'items.*.concepto' => 'required_with:items|string|max:255',
                'items.*.cantidad' => 'required_with:items|numeric|min:0.01',
                'items.*.precio_unitario' => 'required_with:items|numeric|min:0',
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

                    $subtotalItem = $precioUnitario * $cantidad;
                    $igvItem = $item['tipo_afectacion_igv'] === '10' ? $subtotalItem * 0.18 : 0;

                    $subtotal += $subtotalItem;
                    $totalIgv += $igvItem;
                }

                $total = $subtotal + $totalIgv;

                $notaDebito->update([
                    'subtotal' => $subtotal,
                    'igv' => $totalIgv,
                    'total' => $total,
                ]);
            }

            // Actualizar otros campos
            $notaDebito->update($request->only(['motivo', 'observaciones']));

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $notaDebito->fresh(),
                'message' => 'Nota de débito actualizada exitosamente',
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
                'message' => 'Nota de débito no encontrada',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar nota de débito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar nota de débito por WhatsApp
     */
    public function enviarWhatsApp(Request $request, $id): JsonResponse
    {
        try {
            $notaDebito = NotaDebito::with(['cliente'])->findOrFail($id);

            // Validar que tenga XML generado
            if (! $notaDebito->xml) {
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
            $numeroCompleto = $notaDebito->serie.'-'.$notaDebito->numero;

            // Generar URLs públicas
            $pdfUrl = url("/api/nota-debito/pdf/{$notaDebito->id}/{$numeroCompleto}");
            $xmlUrl = url("/api/nota-debito/xml/{$notaDebito->id}/{$numeroCompleto}");
            $cdrUrl = $notaDebito->cdr ? url("/api/nota-debito/cdr/{$notaDebito->id}/{$numeroCompleto}") : null;

            $mensaje = $request->mensaje ?? "Nota de Débito {$numeroCompleto}\n\nPDF: {$pdfUrl}\nXML: {$xmlUrl}";
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
                'message' => 'Nota de débito no encontrada',
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
     * Enviar nota de débito por Email
     */
    public function enviarEmail(Request $request, $id): JsonResponse
    {
        try {
            $request->validate([
                'email' => 'required|email|max:255',
                'mensaje' => 'nullable|string|max:1000',
            ]);

            $notaDebito = NotaDebito::with(['cliente', 'venta'])->findOrFail($id);

            // Validar que tenga XML generado
            if (! $notaDebito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe generar el XML antes de enviar por Email',
                ], 400);
            }

            // Validar que tenga PDF
            if (! $notaDebito->pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'La nota no tiene PDF generado',
                ], 400);
            }

            // Validar que esté aceptada
            if ($notaDebito->estado !== 'aceptado') {
                return response()->json([
                    'success' => false,
                    'message' => 'La nota debe estar aceptada por SUNAT antes de enviarla',
                    'data' => [
                        'estado_actual' => $notaDebito->estado,
                    ],
                ], 400);
            }

            $numeroCompleto = $notaDebito->serie.'-'.$notaDebito->numero;
            
            // Obtener nombre del cliente
            $nombreCliente = $notaDebito->cliente->razon_social ?? $notaDebito->cliente->nombre_comercial ?? 'Cliente';

            // Mensaje personalizado
            $mensajeTexto = $request->mensaje ?? "Estimado(a) {$nombreCliente}, adjuntamos su Nota de Débito {$numeroCompleto}.";

            try {
                // Enviar email con la nota adjunta
                \Illuminate\Support\Facades\Mail::to($request->email)->send(
                    new \App\Mail\NotaDebitoEmail($notaDebito, $mensajeTexto)
                );

                \Illuminate\Support\Facades\Log::info('Email de Nota de Débito enviado exitosamente', [
                    'nota_debito_id' => $notaDebito->id,
                    'email' => $request->email,
                    'numero' => $numeroCompleto,
                ]);

                // Registrar envío exitoso
                try {
                    \App\Models\NotificacionEnviada::registrarEnvio(
                        $notaDebito->venta_id,
                        'email',
                        $request->email,
                        $mensajeTexto,
                        null,
                        'nota_debito',
                        $notaDebito->id
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('No se pudo registrar el envío de email', [
                        'error' => $e->getMessage(),
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Nota de Débito enviada por email exitosamente',
                    'data' => [
                        'email' => $request->email,
                        'numero' => $numeroCompleto,
                        'fecha_envio' => now()->format('Y-m-d H:i:s'),
                    ],
                ]);

            } catch (\Exception $mailError) {
                \Illuminate\Support\Facades\Log::error('Error al enviar email de Nota de Débito', [
                    'nota_debito_id' => $notaDebito->id,
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
                'message' => 'Nota de débito no encontrada',
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
     * Consultar estado de nota de débito en SUNAT
     */
    public function consultarSunat($id): JsonResponse
    {
        try {
            $notaDebito = NotaDebito::findOrFail($id);

            // Validar que tenga XML generado
            if (! $notaDebito->xml) {
                return response()->json([
                    'success' => false,
                    'message' => 'La nota no tiene XML generado para consultar',
                ], 400);
            }

            // Consultar estado en SUNAT
            $resultado = $this->notasService->consultarEstadoNotaDebito($id);

            return response()->json($resultado);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nota de débito no encontrada',
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
