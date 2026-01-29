<?php

namespace App\Http\Controllers\Facturacion;

use App\Models\Resumen;
use App\Models\Comprobante;
use App\Models\EmpresaInfo;
use App\Services\GreenterService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ResumenesController extends BaseController
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Listar resúmenes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Resumen::with(['empresa']);

            // Filtros
            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
                $query->whereBetween('fecha_resumen', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('identificador', 'LIKE', "%{$search}%")
                      ->orWhere('ticket', 'LIKE', "%{$search}%");
                });
            }

            $resumenes = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $resumenes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener resúmenes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar resumen
     */
    public function show($id): JsonResponse
    {
        try {
            $resumen = Resumen::with(['empresa', 'detalles.comprobante'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $resumen
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Resumen no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Crear resumen diario
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'fecha_resumen' => 'required|date',
                'comprobantes_ids' => 'required|array|min:1',
                'comprobantes_ids.*' => 'exists:comprobantes,id'
            ]);

            DB::beginTransaction();

            $empresa = EmpresaInfo::first();
            if (!$empresa) {
                throw new \Exception('No se encontró información de la empresa');
            }

            $fechaResumen = Carbon::parse($request->fecha_resumen);
            $identificador = $empresa->ruc . '-' . $fechaResumen->format('Ymd') . '-' . rand(1000, 9999);

            // Obtener comprobantes
            $comprobantes = Comprobante::whereIn('id', $request->comprobantes_ids)
                ->where('estado', 'ACEPTADO')
                ->whereDate('fecha_emision', $fechaResumen)
                ->get();

            if ($comprobantes->isEmpty()) {
                throw new \Exception('No se encontraron comprobantes válidos para la fecha especificada');
            }

            // Calcular totales
            $totalGravado = $comprobantes->sum('operacion_gravada');
            $totalExonerado = $comprobantes->sum('operacion_exonerada');
            $totalInafecto = $comprobantes->sum('operacion_inafecta');
            $totalIgv = $comprobantes->sum('total_igv');
            $totalGeneral = $comprobantes->sum('importe_total');

            // Crear resumen
            $resumen = Resumen::create([
                'empresa_id' => $empresa->id,
                'fecha_resumen' => $fechaResumen->format('Y-m-d'),
                'fecha_generacion' => now()->format('Y-m-d'),
                'correlativo' => Resumen::where('fecha_resumen', $fechaResumen->format('Y-m-d'))->count() + 1,
                'identificador' => $identificador,
                'cantidad_comprobantes' => $comprobantes->count(),
                'total_gravado' => $totalGravado,
                'total_exonerado' => $totalExonerado,
                'total_inafecto' => $totalInafecto,
                'total_igv' => $totalIgv,
                'total_general' => $totalGeneral,
                'estado' => 'PENDIENTE'
            ]);

            // Crear detalles del resumen
            foreach ($comprobantes as $comprobante) {
                $resumen->detalles()->create([
                    'comprobante_id' => $comprobante->id,
                    'tipo_comprobante' => $comprobante->tipo_comprobante,
                    'serie' => $comprobante->serie,
                    'numero' => $comprobante->correlativo,
                    'estado_item' => '1', // 1 = Agregar, 2 = Modificar, 3 = Anular
                    'total' => $comprobante->importe_total,
                    'igv' => $comprobante->total_igv
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $resumen->load('detalles.comprobante'),
                'message' => 'Resumen diario creado exitosamente'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear resumen diario',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enviar resumen a SUNAT
     */
    public function enviar($id): JsonResponse
    {
        try {
            $resumen = Resumen::with(['detalles.comprobante'])->findOrFail($id);

            if ($resumen->estado !== 'PENDIENTE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden enviar resúmenes pendientes'
                ], 400);
            }

            // Usar el GreenterService para enviar
            $comprobantesIds = $resumen->detalles->pluck('comprobante_id')->toArray();
            $resultado = $this->greenterService->generarResumenDiario($resumen->fecha_resumen, $comprobantesIds);

            if ($resultado['success']) {
                $resumen->update([
                    'estado' => 'ENVIADO',
                    'ticket' => $resultado['data']['ticket'],
                    'fecha_envio' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Resumen enviado a SUNAT exitosamente',
                    'data' => [
                        'resumen' => $resumen->fresh(),
                        'ticket' => $resultado['data']['ticket']
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al enviar resumen a SUNAT',
                    'error' => $resultado['error']
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar resumen',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Consultar estado del ticket
     */
    public function consultarTicket($id): JsonResponse
    {
        try {
            $resumen = Resumen::findOrFail($id);

            if (!$resumen->ticket) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este resumen no tiene ticket asociado'
                ], 400);
            }

            // Usar el GreenterService para consultar
            $resultado = $this->greenterService->consultarTicket($resumen->ticket);

            if ($resultado['success']) {
                $resumen->update([
                    'estado' => $resultado['data']['estado'],
                    'codigo_sunat' => $resultado['data']['codigo_sunat'],
                    'mensaje_sunat' => $resultado['data']['mensaje_sunat'],
                    'fecha_procesamiento' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'resumen' => $resumen->fresh(),
                        'estado' => $resultado['data']['estado'],
                        'codigo_sunat' => $resultado['data']['codigo_sunat'],
                        'mensaje_sunat' => $resultado['data']['mensaje_sunat']
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al consultar ticket',
                    'error' => $resultado['error']
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al consultar ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Descargar XML del resumen
     */
    public function xml($id)
    {
        try {
            $resumen = Resumen::findOrFail($id);

            if (!$resumen->xml_path || !file_exists($resumen->xml_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible para este resumen'
                ], 404);
            }

            $filename = "resumen_{$resumen->identificador}.xml";
            $content = file_get_contents($resumen->xml_path);

            return response()->streamDownload(function () use ($content) {
                echo $content;
            }, $filename, [
                'Content-Type' => 'application/xml'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar XML',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Descargar CDR del resumen
     */
    public function cdr($id)
    {
        try {
            $resumen = Resumen::findOrFail($id);

            if (!$resumen->cdr_path || !file_exists($resumen->cdr_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible para este resumen'
                ], 404);
            }

            $filename = "cdr_resumen_{$resumen->identificador}.xml";
            $content = file_get_contents($resumen->cdr_path);

            return response()->streamDownload(function () use ($content) {
                echo $content;
            }, $filename, [
                'Content-Type' => 'application/xml'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar CDR',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


