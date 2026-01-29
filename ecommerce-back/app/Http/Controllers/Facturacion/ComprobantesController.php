<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use App\Mail\ComprobanteEmail;
use App\Models\Comprobante;
use App\Services\GreenterService;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Response;

class ComprobantesController extends Controller
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    public function index(Request $request)
    {
        try {
            $query = Comprobante::with(['cliente', 'user']);

            // Filtros
            if ($request->has('tipo_comprobante')) {
                $query->where('tipo_comprobante', $request->tipo_comprobante);
            }

            if ($request->has('estado')) {
                $query->where('estado', $request->estado);
            }

            if ($request->has('cliente_id')) {
                $query->where('cliente_id', $request->cliente_id);
            }

            if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
                $query->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('numero_completo', 'LIKE', "%{$search}%")
                        ->orWhere('cliente_razon_social', 'LIKE', "%{$search}%")
                        ->orWhere('cliente_numero_documento', 'LIKE', "%{$search}%");
                });
            }

            $comprobantes = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json($comprobantes);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener comprobantes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $comprobante = Comprobante::with([
                'cliente',
                'detalles.producto',
                'user',
                'comprobanteReferencia',
                'notasRelacionadas',
            ])->findOrFail($id);

            return response()->json($comprobante);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Comprobante no encontrado',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function reenviar($id)
    {
        try {
            $resultado = $this->greenterService->reenviarComprobante($id);

            if ($resultado['success']) {
                return response()->json([
                    'message' => $resultado['mensaje'],
                    'comprobante' => $resultado['comprobante'],
                ]);
            } else {
                return response()->json([
                    'message' => 'Error al reenviar comprobante',
                    'error' => $resultado['error'],
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al reenviar comprobante',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function consultar($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);
            $resultado = $this->greenterService->consultarComprobante($comprobante);

            if ($resultado['success']) {
                return response()->json([
                    'message' => 'Estado consultado exitosamente',
                    'estado' => $resultado['estado'],
                    'comprobante' => $comprobante->fresh(),
                ]);
            } else {
                return response()->json([
                    'message' => 'Error al consultar estado',
                    'error' => $resultado['error'],
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al consultar comprobante',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function descargarPdf($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);

            if (! $comprobante->pdf_base64) {
                return response()->json([
                    'message' => 'PDF no disponible para este comprobante',
                ], 404);
            }

            $pdf = base64_decode($comprobante->pdf_base64);
            $filename = "comprobante_{$comprobante->numero_completo}.pdf";

            return Response::make($pdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al descargar PDF',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function descargarXml($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);

            if (! $comprobante->xml_firmado) {
                return response()->json([
                    'message' => 'XML no disponible para este comprobante',
                ], 404);
            }

            $filename = "comprobante_{$comprobante->numero_completo}.xml";

            return Response::make($comprobante->xml_firmado, 200, [
                'Content-Type' => 'application/xml',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al descargar XML',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function estadisticas(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $totalComprobantes = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->count();
            $montoTotal = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])->sum('importe_total');

            $estadisticasPorEstado = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->selectRaw('estado, COUNT(*) as cantidad, SUM(importe_total) as monto')
                ->groupBy('estado')
                ->get();

            $estadisticasPorTipo = Comprobante::whereBetween('fecha_emision', [$fechaInicio, $fechaFin])
                ->selectRaw('tipo_comprobante, COUNT(*) as cantidad, SUM(importe_total) as monto')
                ->groupBy('tipo_comprobante')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_comprobantes' => $totalComprobantes,
                    'monto_total' => $montoTotal,
                    'por_estado' => $estadisticasPorEstado,
                    'por_tipo' => $estadisticasPorTipo,
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
     * Descargar CDR (Constancia de Recepción)
     */
    public function descargarCdr($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);

            if (! $comprobante->xml_respuesta_sunat) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible para este comprobante',
                ], 404);
            }

            $filename = "cdr_{$comprobante->numero_completo}.xml";

            return Response::make($comprobante->xml_respuesta_sunat, 200, [
                'Content-Type' => 'application/xml',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar CDR',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar comprobante por email
     */
    public function enviarEmail(Request $request, $id)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'mensaje' => 'nullable|string|max:500',
            ]);

            $comprobante = Comprobante::with('cliente')->findOrFail($id);

            if (! $comprobante->pdf_base64) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF no disponible para este comprobante',
                ], 404);
            }

            // Regenerar PDF con QR actualizado antes de enviar
            try {
                $pdfService = app(\App\Services\PdfGeneratorService::class);
                $pdfService->generarPdfSunat($comprobante->fresh());
                $comprobante = $comprobante->fresh(); // Recargar con PDF actualizado
                
                Log::info('PDF regenerado con QR para email', [
                    'comprobante_id' => $comprobante->id
                ]);
            } catch (\Exception $pdfError) {
                // Si falla la regeneración, usar el PDF existente
                Log::warning('No se pudo regenerar PDF, usando existente', [
                    'comprobante_id' => $comprobante->id,
                    'error' => $pdfError->getMessage()
                ]);
            }

            // Enviar email con el comprobante adjunto
            Mail::to($request->email)->send(new ComprobanteEmail($comprobante, $request->mensaje));

            Log::info('Comprobante enviado por email', [
                'comprobante_id' => $comprobante->id,
                'numero' => $comprobante->serie.'-'.$comprobante->correlativo,
                'destinatario' => $request->email,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Comprobante enviado por email exitosamente',
                'data' => [
                    'email' => $request->email,
                    'comprobante' => $comprobante->serie.'-'.str_pad($comprobante->correlativo, 8, '0', STR_PAD_LEFT),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error al enviar email de comprobante', [
                'comprobante_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al enviar email',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar comprobante por WhatsApp
     */
    public function enviarWhatsApp(Request $request, $id)
    {
        try {
            $request->validate([
                'telefono' => 'required|string|min:9|max:15',
                'mensaje' => 'nullable|string|max:500',
            ]);

            $comprobante = Comprobante::with('cliente')->findOrFail($id);

            if (! $comprobante->pdf_base64) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF no disponible para este comprobante',
                ], 404);
            }

            // Verificar si WhatsApp está habilitado
            if (! WhatsAppService::estaHabilitado()) {
                return response()->json([
                    'success' => false,
                    'message' => 'El servicio de WhatsApp no está habilitado',
                ], 503);
            }

            // Enviar comprobante por WhatsApp
            $whatsappService = new WhatsAppService;
            $whatsappService->enviarComprobante($comprobante, $request->telefono);

            Log::info('Comprobante enviado por WhatsApp', [
                'comprobante_id' => $comprobante->id,
                'numero' => $comprobante->serie.'-'.$comprobante->correlativo,
                'telefono' => $request->telefono,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Comprobante enviado por WhatsApp exitosamente',
                'data' => [
                    'telefono' => $request->telefono,
                    'comprobante' => $comprobante->serie.'-'.str_pad($comprobante->correlativo, 8, '0', STR_PAD_LEFT),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error al enviar WhatsApp de comprobante', [
                'comprobante_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al enviar WhatsApp',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Anular comprobante
     */
    public function anular(Request $request, $id)
    {
        try {
            $request->validate([
                'motivo' => 'required|string|max:255',
            ]);

            $comprobante = Comprobante::findOrFail($id);

            if ($comprobante->estado === 'ANULADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'El comprobante ya está anulado',
                ], 400);
            }

            if ($comprobante->estado === 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede anular un comprobante aceptado por SUNAT',
                ], 400);
            }

            $comprobante->update([
                'estado' => 'ANULADO',
                'observaciones' => $request->motivo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Comprobante anulado exitosamente',
                'data' => $comprobante,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al anular comprobante',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar o reenviar comprobante a SUNAT
     * POST /api/comprobantes/{id}/enviar-sunat
     */
    public function enviarSunat($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);

            if ($comprobante->estado === 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'Este comprobante ya fue aceptado por SUNAT',
                ], 400);
            }

            if ($comprobante->estado === 'ANULADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede enviar un comprobante anulado',
                ], 400);
            }

            // Enviar a SUNAT usando Greenter
            $resultado = $this->greenterService->enviarComprobante($comprobante);

            if ($resultado['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Comprobante enviado exitosamente a SUNAT',
                    'data' => [
                        'estado' => $comprobante->fresh()->estado,
                        'mensaje_sunat' => $comprobante->fresh()->mensaje_sunat,
                        'fecha_envio' => $comprobante->fresh()->fecha_envio_sunat,
                    ],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al enviar a SUNAT',
                    'error' => $resultado['error'] ?? 'Error desconocido',
                    'errores_sunat' => $resultado['errores_sunat'] ?? [],
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Error al enviar comprobante a SUNAT', [
                'comprobante_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al enviar comprobante',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Consultar estado del comprobante en SUNAT
     * POST /api/comprobantes/{id}/consultar-estado
     */
    public function consultarEstado($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);

            if (! $comprobante->xml_firmado) {
                return response()->json([
                    'success' => false,
                    'message' => 'El comprobante no tiene XML firmado',
                ], 400);
            }

            // Consultar estado en SUNAT
            $resultado = $this->greenterService->consultarEstado($comprobante);

            return response()->json([
                'success' => true,
                'data' => [
                    'estado_actual' => $comprobante->fresh()->estado,
                    'mensaje_sunat' => $comprobante->fresh()->mensaje_sunat,
                    'fecha_consulta' => now(),
                    'resultado_consulta' => $resultado,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al consultar estado',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Regenerar XML y PDF del comprobante
     * POST /api/comprobantes/{id}/regenerar
     */
    public function regenerar($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);

            if ($comprobante->estado === 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede regenerar un comprobante aceptado por SUNAT',
                ], 400);
            }

            // Regenerar documentos
            $resultado = $this->greenterService->regenerarDocumentos($comprobante);

            if ($resultado['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Documentos regenerados exitosamente',
                    'data' => [
                        'tiene_xml' => $comprobante->fresh()->xml_firmado ? true : false,
                        'tiene_pdf' => $comprobante->fresh()->pdf_base64 ? true : false,
                    ],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al regenerar documentos',
                    'error' => $resultado['error'],
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al regenerar documentos',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Listar comprobantes pendientes de envío
     * GET /api/comprobantes/pendientes-envio
     */
    public function pendientesEnvio(Request $request)
    {
        try {
            $query = Comprobante::with(['cliente', 'user'])
                ->where('estado', 'PENDIENTE')
                ->orderBy('fecha_emision', 'desc');

            // Filtros adicionales
            if ($request->has('tipo_comprobante')) {
                $query->where('tipo_comprobante', $request->tipo_comprobante);
            }

            if ($request->has('fecha_desde')) {
                $query->where('fecha_emision', '>=', $request->fecha_desde);
            }

            $comprobantes = $query->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $comprobantes,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener comprobantes pendientes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Listar comprobantes rechazados
     * GET /api/comprobantes/rechazados
     */
    public function rechazados(Request $request)
    {
        try {
            $query = Comprobante::with(['cliente', 'user'])
                ->where('estado', 'RECHAZADO')
                ->orderBy('fecha_respuesta_sunat', 'desc');

            // Filtros adicionales
            if ($request->has('tipo_comprobante')) {
                $query->where('tipo_comprobante', $request->tipo_comprobante);
            }

            if ($request->has('fecha_desde')) {
                $query->where('fecha_emision', '>=', $request->fecha_desde);
            }

            $comprobantes = $query->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $comprobantes,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener comprobantes rechazados',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Envío masivo de comprobantes a SUNAT
     * POST /api/comprobantes/envio-masivo
     */
    public function envioMasivo(Request $request)
    {
        try {
            $request->validate([
                'comprobante_ids' => 'required|array|min:1',
                'comprobante_ids.*' => 'required|integer|exists:comprobantes,id',
            ]);

            $resultados = [];
            $exitosos = 0;
            $fallidos = 0;

            foreach ($request->comprobante_ids as $id) {
                try {
                    $comprobante = Comprobante::find($id);

                    if ($comprobante->estado === 'PENDIENTE') {
                        $resultado = $this->greenterService->enviarComprobante($comprobante);

                        if ($resultado['success']) {
                            $exitosos++;
                            $resultados[] = [
                                'comprobante_id' => $id,
                                'numero_completo' => $comprobante->numero_completo,
                                'success' => true,
                                'mensaje' => 'Enviado exitosamente',
                            ];
                        } else {
                            $fallidos++;
                            $resultados[] = [
                                'comprobante_id' => $id,
                                'numero_completo' => $comprobante->numero_completo,
                                'success' => false,
                                'mensaje' => $resultado['error'] ?? 'Error desconocido',
                            ];
                        }
                    } else {
                        $resultados[] = [
                            'comprobante_id' => $id,
                            'numero_completo' => $comprobante->numero_completo,
                            'success' => false,
                            'mensaje' => "Estado no válido: {$comprobante->estado}",
                        ];
                        $fallidos++;
                    }
                } catch (\Exception $e) {
                    $fallidos++;
                    $resultados[] = [
                        'comprobante_id' => $id,
                        'success' => false,
                        'mensaje' => $e->getMessage(),
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Envío masivo completado: {$exitosos} exitosos, {$fallidos} fallidos",
                'data' => [
                    'total' => count($request->comprobante_ids),
                    'exitosos' => $exitosos,
                    'fallidos' => $fallidos,
                    'resultados' => $resultados,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error en envío masivo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generar nota de crédito desde un comprobante
     * POST /api/comprobantes/{id}/generar-nota-credito
     */
    public function generarNotaCredito(Request $request, $id)
    {
        try {
            $request->validate([
                'tipo_nota' => 'required|string|in:01,02,03,04,05,06,07,08,09',
                'motivo' => 'required|string|max:500',
                'items' => 'required|array|min:1',
                'items.*.producto_id' => 'required|integer',
                'items.*.cantidad' => 'required|numeric|min:0.01',
                'items.*.precio_unitario' => 'required|numeric|min:0',
            ]);

            $comprobante = Comprobante::findOrFail($id);

            if ($comprobante->estado !== 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden generar notas de crédito para comprobantes aceptados',
                ], 400);
            }

            // Crear nota de crédito
            $notaCredito = $this->greenterService->generarNotaCredito($comprobante, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Nota de crédito generada exitosamente',
                'data' => $notaCredito,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar nota de crédito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generar nota de débito desde un comprobante
     * POST /api/comprobantes/{id}/generar-nota-debito
     */
    public function generarNotaDebito(Request $request, $id)
    {
        try {
            $request->validate([
                'tipo_nota' => 'required|string|in:01,02,03',
                'motivo' => 'required|string|max:500',
                'monto_adicional' => 'required|numeric|min:0.01',
            ]);

            $comprobante = Comprobante::findOrFail($id);

            if ($comprobante->estado !== 'ACEPTADO') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden generar notas de débito para comprobantes aceptados',
                ], 400);
            }

            // Crear nota de débito
            $notaDebito = $this->greenterService->generarNotaDebito($comprobante, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Nota de débito generada exitosamente',
                'data' => $notaDebito,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar nota de débito',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Buscar comprobante por número completo
     * Endpoint: GET /api/comprobantes/buscar?numero={numero_completo}
     */
    public function buscar(Request $request)
    {
        try {
            $request->validate([
                'numero' => 'required|string',
            ]);

            $numeroCompleto = $request->numero;

            // Buscar el comprobante por número completo o por serie-correlativo
            $comprobante = Comprobante::with(['cliente', 'detalles.producto'])
                ->where(function ($query) use ($numeroCompleto) {
                    $query->where('numero_completo', $numeroCompleto);
                    
                    // También buscar por serie-correlativo separado
                    if (strpos($numeroCompleto, '-') !== false) {
                        $partes = explode('-', $numeroCompleto);
                        if (count($partes) === 2) {
                            $query->orWhere(function ($q) use ($partes) {
                                $q->where('serie', $partes[0])
                                  ->where('correlativo', ltrim($partes[1], '0'));
                            });
                        }
                    }
                })
                ->first();

            if (!$comprobante) {
                return response()->json([
                    'success' => false,
                    'message' => "No se encontró el comprobante {$numeroCompleto}",
                    'data' => null,
                ], 404);
            }

            // Verificar si tiene notas de crédito o débito asociadas
            $tieneNotaCredito = \App\Models\NotaCredito::where('venta_id', $comprobante->venta_id)
                ->where('serie_comprobante_ref', $comprobante->serie)
                ->where('numero_comprobante_ref', $comprobante->correlativo)
                ->exists();

            $tieneNotaDebito = \App\Models\NotaDebito::where('venta_id', $comprobante->venta_id)
                ->where('serie_comprobante_ref', $comprobante->serie)
                ->where('numero_comprobante_ref', $comprobante->correlativo)
                ->exists();

            // Obtener IDs de las notas si existen
            $notaCreditoId = null;
            $notaDebitoId = null;

            if ($tieneNotaCredito) {
                $notaCredito = \App\Models\NotaCredito::where('venta_id', $comprobante->venta_id)
                    ->where('serie_comprobante_ref', $comprobante->serie)
                    ->where('numero_comprobante_ref', $comprobante->correlativo)
                    ->first();
                $notaCreditoId = $notaCredito ? $notaCredito->id : null;
            }

            if ($tieneNotaDebito) {
                $notaDebito = \App\Models\NotaDebito::where('venta_id', $comprobante->venta_id)
                    ->where('serie_comprobante_ref', $comprobante->serie)
                    ->where('numero_comprobante_ref', $comprobante->correlativo)
                    ->first();
                $notaDebitoId = $notaDebito ? $notaDebito->id : null;
            }

            // Determinar si puede ser anulado
            $puedeAnular = $comprobante->estado === 'ACEPTADO' && !$tieneNotaCredito;

            // Preparar respuesta
            $data = [
                'id' => $comprobante->id,
                'venta_id' => $comprobante->venta_id,
                'serie' => $comprobante->serie,
                'correlativo' => $comprobante->correlativo,
                'numero_completo' => $comprobante->serie . '-' . str_pad($comprobante->correlativo, 4, '0', STR_PAD_LEFT),
                'tipo_comprobante' => $comprobante->tipo_comprobante,
                'tipo_comprobante_nombre' => $this->getTipoComprobanteName($comprobante->tipo_comprobante),
                'fecha_emision' => $comprobante->fecha_emision,
                'hora_emision' => $comprobante->hora_emision ?? null,
                'moneda' => $comprobante->moneda,
                'subtotal' => number_format($comprobante->operacion_gravada ?? 0, 2, '.', ''),
                'total_igv' => number_format($comprobante->total_igv ?? 0, 2, '.', ''),
                'total' => number_format($comprobante->importe_total ?? 0, 2, '.', ''),
                'estado' => $comprobante->estado,
                'cliente' => $comprobante->cliente ? [
                    'id' => $comprobante->cliente->id,
                    'tipo_documento' => $comprobante->cliente->tipo_documento,
                    'numero_documento' => $comprobante->cliente->numero_documento,
                    'nombre' => $comprobante->cliente->razon_social,
                    'direccion' => $comprobante->cliente->direccion,
                    'email' => $comprobante->cliente->email,
                    'telefono' => $comprobante->cliente->telefono,
                ] : null,
                'detalles' => $comprobante->detalles->map(function ($detalle) {
                    return [
                        'id' => $detalle->id,
                        'producto_id' => $detalle->producto_id,
                        'descripcion' => $detalle->descripcion ?? ($detalle->producto ? $detalle->producto->nombre : 'Sin descripción'),
                        'cantidad' => number_format($detalle->cantidad, 2, '.', ''),
                        'precio_unitario' => number_format($detalle->precio_unitario, 2, '.', ''),
                        'subtotal' => number_format($detalle->subtotal ?? 0, 2, '.', ''),
                        'igv' => number_format($detalle->igv ?? 0, 2, '.', ''),
                        'total' => number_format($detalle->total ?? 0, 2, '.', ''),
                        'tipo_afectacion_igv' => $detalle->tipo_afectacion_igv ?? '10',
                    ];
                }),
                'tiene_nota_credito' => $tieneNotaCredito,
                'nota_credito_id' => $notaCreditoId,
                'tiene_nota_debito' => $tieneNotaDebito,
                'nota_debito_id' => $notaDebitoId,
                'puede_anular' => $puedeAnular,
            ];

            $response = [
                'success' => true,
                'data' => $data,
            ];

            // Agregar warning si ya tiene nota de crédito
            if ($tieneNotaCredito) {
                $response['warning'] = 'Este comprobante ya tiene una nota de crédito asociada';
            }

            return response()->json($response);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Parámetro "numero" es requerido',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar comprobante',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener nombre del tipo de comprobante
     */
    private function getTipoComprobanteName($tipo)
    {
        $tipos = [
            '01' => 'Factura',
            '03' => 'Boleta de Venta',
            '07' => 'Nota de Crédito',
            '08' => 'Nota de Débito',
            '09' => 'Guía de Remisión',
        ];

        return $tipos[$tipo] ?? 'Desconocido';
    }
}
