<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use App\Models\ErrorLog;

class LogsController extends Controller
{
    /**
     * Listar logs del sistema
     */
    public function index(Request $request)
    {
        try {
            $query = ErrorLog::query();

            // Filtros
            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->filled('nivel')) {
                $query->where('nivel', $request->nivel);
            }

            if ($request->filled('modulo')) {
                $query->where('modulo', $request->modulo);
            }

            if ($request->filled('fecha_desde')) {
                $query->whereDate('created_at', '>=', $request->fecha_desde);
            }

            if ($request->filled('fecha_hasta')) {
                $query->whereDate('created_at', '<=', $request->fecha_hasta);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('mensaje', 'LIKE', "%{$search}%")
                      ->orWhere('detalle', 'LIKE', "%{$search}%");
                });
            }

            $logs = $query->orderBy('created_at', 'desc')->paginate(50);

            return response()->json([
                'success' => true,
                'data' => $logs
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener logs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar detalle de un log
     */
    public function show($id)
    {
        try {
            $log = ErrorLog::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $log
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Log no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Registrar un nuevo log de error
     */
    public function store(Request $request)
    {
        $request->validate([
            'tipo' => 'required|in:envio,validacion,ejecucion,sistema',
            'nivel' => 'required|in:info,warning,error,critical',
            'modulo' => 'required|string|max:100',
            'mensaje' => 'required|string',
            'detalle' => 'nullable|string',
            'contexto' => 'nullable|array'
        ]);

        try {
            $log = ErrorLog::create([
                'tipo' => $request->tipo,
                'nivel' => $request->nivel,
                'modulo' => $request->modulo,
                'mensaje' => $request->mensaje,
                'detalle' => $request->detalle,
                'contexto' => $request->contexto ? json_encode($request->contexto) : null,
                'user_id' => auth()->id(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            // También registrar en el sistema de logs de Laravel
            $logMessage = "[{$request->modulo}] {$request->mensaje}";
            switch ($request->nivel) {
                case 'critical':
                    Log::critical($logMessage, $request->contexto ?? []);
                    break;
                case 'error':
                    Log::error($logMessage, $request->contexto ?? []);
                    break;
                case 'warning':
                    Log::warning($logMessage, $request->contexto ?? []);
                    break;
                default:
                    Log::info($logMessage, $request->contexto ?? []);
            }

            return response()->json([
                'success' => true,
                'message' => 'Log registrado exitosamente',
                'data' => $log
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error al registrar log: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar log',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar log como resuelto
     */
    public function marcarResuelto(Request $request, $id)
    {
        $request->validate([
            'solucion' => 'nullable|string|max:500'
        ]);

        try {
            $log = ErrorLog::findOrFail($id);

            $log->update([
                'resuelto' => true,
                'resuelto_por' => auth()->id(),
                'resuelto_en' => now(),
                'solucion' => $request->solucion
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Log marcado como resuelto',
                'data' => $log->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Error al marcar log como resuelto: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar log',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estadísticas de logs
     */
    public function estadisticas(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $logs = ErrorLog::whereBetween('created_at', [$fechaInicio, $fechaFin])->get();

            $estadisticas = [
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ],
                'resumen' => [
                    'total_logs' => $logs->count(),
                    'resueltos' => $logs->where('resuelto', true)->count(),
                    'pendientes' => $logs->where('resuelto', false)->count(),
                    'tasa_resolucion' => $logs->count() > 0 ?
                        round(($logs->where('resuelto', true)->count() / $logs->count()) * 100, 2) : 0
                ],
                'por_nivel' => [
                    'info' => $logs->where('nivel', 'info')->count(),
                    'warning' => $logs->where('nivel', 'warning')->count(),
                    'error' => $logs->where('nivel', 'error')->count(),
                    'critical' => $logs->where('nivel', 'critical')->count()
                ],
                'por_tipo' => [
                    'envio' => $logs->where('tipo', 'envio')->count(),
                    'validacion' => $logs->where('tipo', 'validacion')->count(),
                    'ejecucion' => $logs->where('tipo', 'ejecucion')->count(),
                    'sistema' => $logs->where('tipo', 'sistema')->count()
                ],
                'por_modulo' => $logs->groupBy('modulo')->map(function ($grupo) {
                    return [
                        'total' => $grupo->count(),
                        'errores' => $grupo->where('nivel', 'error')->count(),
                        'criticos' => $grupo->where('nivel', 'critical')->count()
                    ];
                })->sortByDesc('total')->take(10),
                'errores_frecuentes' => $logs->whereIn('nivel', ['error', 'critical'])
                    ->groupBy('mensaje')
                    ->map(function ($grupo) {
                        return [
                            'mensaje' => $grupo->first()->mensaje,
                            'cantidad' => $grupo->count(),
                            'modulo' => $grupo->first()->modulo,
                            'ultima_vez' => $grupo->sortByDesc('created_at')->first()->created_at->format('Y-m-d H:i:s')
                        ];
                    })
                    ->sortByDesc('cantidad')
                    ->take(10)
                    ->values()
            ];

            return response()->json([
                'success' => true,
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener estadísticas de logs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener logs de Laravel (archivo)
     */
    public function laravelLogs(Request $request)
    {
        try {
            $logPath = storage_path('logs/laravel.log');

            if (!File::exists($logPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Archivo de logs no encontrado'
                ], 404);
            }

            // Leer últimas N líneas del archivo
            $lines = $request->lines ?? 100;
            $file = new \SplFileObject($logPath, 'r');
            $file->seek(PHP_INT_MAX);
            $lastLine = $file->key();
            $startLine = max(0, $lastLine - $lines);

            $logs = [];
            $file->seek($startLine);
            while (!$file->eof()) {
                $logs[] = $file->current();
                $file->next();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'archivo' => 'laravel.log',
                    'lineas_totales' => $lastLine + 1,
                    'lineas_mostradas' => count($logs),
                    'contenido' => array_reverse($logs)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener logs de Laravel: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Limpiar logs antiguos
     */
    public function limpiarLogsAntiguos(Request $request)
    {
        $request->validate([
            'dias' => 'required|integer|min:1|max:365',
            'mantener_criticos' => 'nullable|boolean'
        ]);

        try {
            $fechaLimite = now()->subDays($request->dias);
            $manteneCriticos = $request->mantener_criticos ?? true;

            $query = ErrorLog::where('created_at', '<', $fechaLimite)
                ->where('resuelto', true);

            if ($manteneCriticos) {
                $query->where('nivel', '!=', 'critical');
            }

            $logsEliminados = $query->delete();

            Log::info('Logs antiguos eliminados', [
                'cantidad' => $logsEliminados,
                'fecha_limite' => $fechaLimite->format('Y-m-d'),
                'mantener_criticos' => $manteneCriticos,
                'usuario' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Se eliminaron {$logsEliminados} registros de logs antiguos",
                'data' => [
                    'logs_eliminados' => $logsEliminados,
                    'fecha_limite' => $fechaLimite->format('Y-m-d'),
                    'mantener_criticos' => $manteneCriticos
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al limpiar logs antiguos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al limpiar logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exportar logs a CSV
     */
    public function exportarCsv(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $logs = ErrorLog::whereBetween('created_at', [$fechaInicio, $fechaFin])
                ->orderBy('created_at', 'desc')
                ->get();

            $csvData = "ID,Fecha,Tipo,Nivel,Módulo,Mensaje,Resuelto\n";

            foreach ($logs as $log) {
                $csvData .= implode(',', [
                    $log->id,
                    $log->created_at->format('Y-m-d H:i:s'),
                    $log->tipo,
                    $log->nivel,
                    $log->modulo,
                    '"' . str_replace('"', '""', $log->mensaje) . '"',
                    $log->resuelto ? 'Sí' : 'No'
                ]) . "\n";
            }

            $filename = "logs_{$fechaInicio}_{$fechaFin}.csv";

            return response($csvData)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");

        } catch (\Exception $e) {
            Log::error('Error al exportar logs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener logs por módulo
     */
    public function logsPorModulo($modulo)
    {
        try {
            $logs = ErrorLog::where('modulo', $modulo)
                ->orderBy('created_at', 'desc')
                ->limit(100)
                ->get();

            $estadisticas = [
                'total' => $logs->count(),
                'por_nivel' => [
                    'info' => $logs->where('nivel', 'info')->count(),
                    'warning' => $logs->where('nivel', 'warning')->count(),
                    'error' => $logs->where('nivel', 'error')->count(),
                    'critical' => $logs->where('nivel', 'critical')->count()
                ],
                'resueltos' => $logs->where('resuelto', true)->count(),
                'pendientes' => $logs->where('resuelto', false)->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'modulo' => $modulo,
                    'estadisticas' => $estadisticas,
                    'logs' => $logs
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener logs del módulo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear alerta de monitoreo
     */
    public function crearAlerta(Request $request)
    {
        $request->validate([
            'modulo' => 'required|string',
            'nivel' => 'required|in:warning,error,critical',
            'umbral' => 'required|integer|min:1',
            'periodo_minutos' => 'required|integer|min:1',
            'emails' => 'required|array',
            'emails.*' => 'email'
        ]);

        try {
            // Aquí se implementaría la lógica de alertas
            // Por ahora solo registramos la configuración

            Log::info('Alerta de monitoreo creada', [
                'modulo' => $request->modulo,
                'nivel' => $request->nivel,
                'umbral' => $request->umbral,
                'periodo' => $request->periodo_minutos,
                'emails' => $request->emails,
                'usuario' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Alerta de monitoreo configurada exitosamente',
                'data' => $request->all()
            ]);

        } catch (\Exception $e) {
            Log::error('Error al crear alerta: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al crear alerta',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
