<?php

namespace App\Http\Controllers\Facturacion;

use App\Models\Baja;
use App\Models\Comprobante;
use App\Models\EmpresaInfo;
use App\Services\GreenterService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BajasController extends BaseController
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Listar comunicaciones de baja
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Baja::with(['empresa']);

            // Filtros
            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
                $query->whereBetween('fecha_baja', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('identificador', 'LIKE', "%{$search}%")
                      ->orWhere('ticket', 'LIKE', "%{$search}%");
                });
            }

            $bajas = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $bajas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener comunicaciones de baja',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar comunicación de baja
     */
    public function show($id): JsonResponse
    {
        try {
            $baja = Baja::with(['empresa', 'detalles.comprobante'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $baja
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Comunicación de baja no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Crear comunicación de baja
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'fecha_baja' => 'required|date',
                'comprobantes_ids' => 'required|array|min:1',
                'comprobantes_ids.*' => 'exists:comprobantes,id',
                'motivo' => 'required|string|max:255'
            ]);

            DB::beginTransaction();

            $empresa = EmpresaInfo::first();
            if (!$empresa) {
                throw new \Exception('No se encontró información de la empresa');
            }

            $fechaBaja = Carbon::parse($request->fecha_baja);
            $identificador = $empresa->ruc . '-' . $fechaBaja->format('Ymd') . '-' . rand(1000, 9999);

            // Obtener comprobantes
            $comprobantes = Comprobante::whereIn('id', $request->comprobantes_ids)
                ->where('estado', 'ACEPTADO')
                ->get();

            if ($comprobantes->isEmpty()) {
                throw new \Exception('No se encontraron comprobantes válidos para dar de baja');
            }

            // Crear comunicación de baja
            $baja = Baja::create([
                'empresa_id' => $empresa->id,
                'fecha_baja' => $fechaBaja->format('Y-m-d'),
                'fecha_generacion' => now()->format('Y-m-d'),
                'correlativo' => Baja::where('fecha_baja', $fechaBaja->format('Y-m-d'))->count() + 1,
                'identificador' => $identificador,
                'cantidad_comprobantes' => $comprobantes->count(),
                'estado' => 'PENDIENTE'
            ]);

            // Crear detalles de la baja
            foreach ($comprobantes as $comprobante) {
                $baja->detalles()->create([
                    'comprobante_id' => $comprobante->id,
                    'tipo_comprobante' => $comprobante->tipo_comprobante,
                    'serie' => $comprobante->serie,
                    'numero' => $comprobante->correlativo,
                    'motivo' => $request->motivo
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $baja->load('detalles.comprobante'),
                'message' => 'Comunicación de baja creada exitosamente'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear comunicación de baja',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enviar comunicación de baja a SUNAT
     */
    public function enviar($id): JsonResponse
    {
        try {
            $baja = Baja::with(['detalles.comprobante'])->findOrFail($id);

            if ($baja->estado !== 'PENDIENTE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden enviar comunicaciones de baja pendientes'
                ], 400);
            }

            // Usar el GreenterService para enviar
            $comprobantesIds = $baja->detalles->pluck('comprobante_id')->toArray();
            $motivo = $baja->detalles->first()->motivo ?? 'Error en emisión';
            $resultado = $this->greenterService->enviarComunicacionBaja($comprobantesIds, $motivo);

            if ($resultado['success']) {
                $baja->update([
                    'estado' => 'ENVIADO',
                    'ticket' => $resultado['data']['ticket'],
                    'fecha_envio' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Comunicación de baja enviada a SUNAT exitosamente',
                    'data' => [
                        'baja' => $baja->fresh(),
                        'ticket' => $resultado['data']['ticket']
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al enviar comunicación de baja a SUNAT',
                    'error' => $resultado['error']
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar comunicación de baja',
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
            $baja = Baja::findOrFail($id);

            if (!$baja->ticket) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta comunicación de baja no tiene ticket asociado'
                ], 400);
            }

            // Usar el GreenterService para consultar
            $resultado = $this->greenterService->consultarTicket($baja->ticket);

            if ($resultado['success']) {
                $baja->update([
                    'estado' => $resultado['data']['estado'],
                    'codigo_sunat' => $resultado['data']['codigo_sunat'],
                    'mensaje_sunat' => $resultado['data']['mensaje_sunat'],
                    'fecha_procesamiento' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'baja' => $baja->fresh(),
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
     * Descargar XML de la comunicación de baja
     */
    public function xml($id)
    {
        try {
            $baja = Baja::findOrFail($id);

            if (!$baja->xml_path || !file_exists($baja->xml_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'XML no disponible para esta comunicación de baja'
                ], 404);
            }

            $filename = "baja_{$baja->identificador}.xml";
            $content = file_get_contents($baja->xml_path);

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
     * Descargar CDR de la comunicación de baja
     */
    public function cdr($id)
    {
        try {
            $baja = Baja::findOrFail($id);

            if (!$baja->cdr_path || !file_exists($baja->cdr_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'CDR no disponible para esta comunicación de baja'
                ], 404);
            }

            $filename = "cdr_baja_{$baja->identificador}.xml";
            $content = file_get_contents($baja->cdr_path);

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


