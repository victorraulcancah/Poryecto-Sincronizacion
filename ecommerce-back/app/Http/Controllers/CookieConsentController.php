<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CookieConsentController extends Controller
{
    /**
     * Obtener configuración pública del banner de cookies
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerConfiguracionPublica()
    {
        try {
            $config = DB::table('cookies_config')
                ->whereIn('categoria', ['banner', 'consentimiento', 'descripciones', 'categorias', 'display'])
                ->get()
                ->keyBy('clave')
                ->map(function ($item) {
                    // Convertir el valor según su tipo
                    switch ($item->tipo) {
                        case 'boolean':
                            return (bool) $item->valor;
                        case 'integer':
                            return (int) $item->valor;
                        case 'json':
                            return json_decode($item->valor, true);
                        default:
                            return $item->valor;
                    }
                });

            return response()->json([
                'success' => true,
                'data' => $config
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener configuración: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener preferencias de cookies del usuario actual
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerPreferencias(Request $request)
    {
        try {
            $userId = Auth::id();
            $sessionId = $request->input('session_id', session()->getId());

            // Buscar preferencias por user_id o session_id
            $preferencias = DB::table('cookies_preferences')
                ->where(function ($query) use ($userId, $sessionId) {
                    if ($userId) {
                        $query->where('user_id', $userId);
                    } else {
                        $query->where('session_id', $sessionId);
                    }
                })
                ->where(function ($query) {
                    $query->where('fecha_expiracion', '>', now())
                        ->orWhereNull('fecha_expiracion');
                })
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$preferencias) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' => 'No hay preferencias guardadas'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $preferencias->id,
                    'cookies_necesarias' => (bool) $preferencias->cookies_necesarias,
                    'cookies_analiticas' => (bool) $preferencias->cookies_analiticas,
                    'cookies_marketing' => (bool) $preferencias->cookies_marketing,
                    'cookies_funcionales' => (bool) $preferencias->cookies_funcionales,
                    'consintio_todo' => (bool) $preferencias->consintio_todo,
                    'rechazo_todo' => (bool) $preferencias->rechazo_todo,
                    'personalizado' => (bool) $preferencias->personalizado,
                    'fecha_consentimiento' => $preferencias->fecha_consentimiento,
                    'fecha_expiracion' => $preferencias->fecha_expiracion,
                    'version_politica' => $preferencias->version_politica,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener preferencias: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Guardar preferencias de cookies
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function guardarPreferencias(Request $request)
    {
        $request->validate([
            'cookies_analiticas' => 'required|boolean',
            'cookies_marketing' => 'required|boolean',
            'cookies_funcionales' => 'required|boolean',
            'consintio_todo' => 'boolean',
            'rechazo_todo' => 'boolean',
            'personalizado' => 'boolean',
            'session_id' => 'nullable|string',
        ]);

        try {
            $userId = Auth::id();
            $sessionId = $request->input('session_id', session()->getId());
            $ipAddress = $request->ip();
            $userAgent = $request->userAgent();

            // Obtener versión de la política actual
            $versionPolitica = DB::table('cookies_config')
                ->where('clave', 'consentimiento_version_politica')
                ->value('valor') ?? '1.0';

            // Detectar navegador y dispositivo
            $navegador = $this->detectarNavegador($userAgent);
            $dispositivo = $this->detectarDispositivo($userAgent);

            // Buscar si ya existe una preferencia
            $preferenciaExistente = DB::table('cookies_preferences')
                ->where(function ($query) use ($userId, $sessionId) {
                    if ($userId) {
                        $query->where('user_id', $userId);
                    } else {
                        $query->where('session_id', $sessionId);
                    }
                })
                ->first();

            $datos = [
                'user_id' => $userId,
                'session_id' => $sessionId,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'cookies_necesarias' => true, // Siempre activas
                'cookies_analiticas' => $request->input('cookies_analiticas'),
                'cookies_marketing' => $request->input('cookies_marketing'),
                'cookies_funcionales' => $request->input('cookies_funcionales'),
                'consintio_todo' => $request->input('consintio_todo', false),
                'rechazo_todo' => $request->input('rechazo_todo', false),
                'personalizado' => $request->input('personalizado', false),
                'version_politica' => $versionPolitica,
                'navegador' => $navegador,
                'dispositivo' => $dispositivo,
                'fecha_consentimiento' => now(),
                'updated_at' => now(),
            ];

            if ($preferenciaExistente) {
                // Actualizar preferencia existente
                $datos['ultima_actualizacion'] = now();
                $datos['numero_actualizaciones'] = $preferenciaExistente->numero_actualizaciones + 1;

                DB::table('cookies_preferences')
                    ->where('id', $preferenciaExistente->id)
                    ->update($datos);

                $preferenciaId = $preferenciaExistente->id;

                // Registrar en auditoría
                $this->registrarAuditoria(
                    $preferenciaId,
                    $userId,
                    $sessionId,
                    'actualizar',
                    [
                        'necesarias' => $preferenciaExistente->cookies_necesarias,
                        'analiticas' => $preferenciaExistente->cookies_analiticas,
                        'marketing' => $preferenciaExistente->cookies_marketing,
                        'funcionales' => $preferenciaExistente->cookies_funcionales,
                    ],
                    [
                        'necesarias' => $datos['cookies_necesarias'],
                        'analiticas' => $datos['cookies_analiticas'],
                        'marketing' => $datos['cookies_marketing'],
                        'funcionales' => $datos['cookies_funcionales'],
                    ],
                    $ipAddress,
                    $userAgent,
                    $request->input('url_origen')
                );

            } else {
                // Crear nueva preferencia
                $datos['created_at'] = now();
                $datos['numero_actualizaciones'] = 1;

                $preferenciaId = DB::table('cookies_preferences')->insertGetId($datos);
            }

            return response()->json([
                'success' => true,
                'message' => 'Preferencias guardadas exitosamente',
                'data' => [
                    'id' => $preferenciaId,
                    'fecha_expiracion' => Carbon::now()->addDays(365)->toDateTimeString()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar preferencias: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aceptar todas las cookies
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function aceptarTodo(Request $request)
    {
        $request->merge([
            'cookies_analiticas' => true,
            'cookies_marketing' => true,
            'cookies_funcionales' => true,
            'consintio_todo' => true,
            'rechazo_todo' => false,
            'personalizado' => false,
        ]);

        return $this->guardarPreferencias($request);
    }

    /**
     * Rechazar todas las cookies opcionales
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function rechazarTodo(Request $request)
    {
        $request->merge([
            'cookies_analiticas' => false,
            'cookies_marketing' => false,
            'cookies_funcionales' => false,
            'consintio_todo' => false,
            'rechazo_todo' => true,
            'personalizado' => false,
        ]);

        return $this->guardarPreferencias($request);
    }

    /**
     * Obtener estadísticas de consentimiento (solo admin)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerEstadisticas()
    {
        try {
            $estadisticas = DB::table('vista_estadisticas_cookies')->first();

            // Estadísticas por período
            $hoy = DB::table('cookies_preferences')
                ->whereDate('created_at', today())
                ->count();

            $estaSemana = DB::table('cookies_preferences')
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count();

            $esteMes = DB::table('cookies_preferences')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'general' => $estadisticas,
                    'por_periodo' => [
                        'hoy' => $hoy,
                        'esta_semana' => $estaSemana,
                        'este_mes' => $esteMes,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener toda la configuración del sistema (solo admin)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerConfiguracionCompleta()
    {
        try {
            $config = DB::table('cookies_config')
                ->get()
                ->groupBy('categoria');

            return response()->json([
                'success' => true,
                'data' => $config
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener configuración: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuración del sistema (solo admin)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function actualizarConfiguracion(Request $request)
    {
        $request->validate([
            'configuraciones' => 'required|array',
            'configuraciones.*.clave' => 'required|string',
            'configuraciones.*.valor' => 'required',
        ]);

        try {
            DB::beginTransaction();

            foreach ($request->input('configuraciones') as $config) {
                DB::table('cookies_config')
                    ->where('clave', $config['clave'])
                    ->where('editable', true)
                    ->update([
                        'valor' => $config['valor'],
                        'updated_at' => now()
                    ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Configuración actualizada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar configuración: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener log de auditoría (solo admin)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerLogAuditoria(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 50);
            $page = $request->input('page', 1);

            $query = DB::table('cookies_audit_log')
                ->orderBy('created_at', 'desc');

            // Filtros opcionales
            if ($request->has('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            if ($request->has('accion')) {
                $query->where('accion', $request->input('accion'));
            }

            if ($request->has('fecha_desde')) {
                $query->whereDate('created_at', '>=', $request->input('fecha_desde'));
            }

            if ($request->has('fecha_hasta')) {
                $query->whereDate('created_at', '<=', $request->input('fecha_hasta'));
            }

            $total = $query->count();
            $logs = $query
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'pagination' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener log de auditoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Revocar consentimiento del usuario actual
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function revocarConsentimiento(Request $request)
    {
        try {
            $userId = Auth::id();
            $sessionId = $request->input('session_id', session()->getId());

            DB::table('cookies_preferences')
                ->where(function ($query) use ($userId, $sessionId) {
                    if ($userId) {
                        $query->where('user_id', $userId);
                    } else {
                        $query->where('session_id', $sessionId);
                    }
                })
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Consentimiento revocado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al revocar consentimiento: ' . $e->getMessage()
            ], 500);
        }
    }

    // =========================================
    // MÉTODOS AUXILIARES PRIVADOS
    // =========================================

    /**
     * Registrar en log de auditoría
     */
    private function registrarAuditoria($preferenciaId, $userId, $sessionId, $accion, $cookiesAnteriores, $cookiesNuevas, $ipAddress, $userAgent, $urlOrigen = null)
    {
        try {
            DB::table('cookies_audit_log')->insert([
                'preference_id' => $preferenciaId,
                'user_id' => $userId,
                'session_id' => $sessionId,
                'accion' => $accion,
                'cookies_anteriores' => json_encode($cookiesAnteriores),
                'cookies_nuevas' => json_encode($cookiesNuevas),
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'url_origen' => $urlOrigen,
                'created_at' => now()
            ]);
        } catch (\Exception $e) {
            // Log silencioso si falla la auditoría
            \Log::error('Error al registrar auditoría de cookies: ' . $e->getMessage());
        }
    }

    /**
     * Detectar navegador desde User Agent
     */
    private function detectarNavegador($userAgent)
    {
        if (strpos($userAgent, 'Firefox') !== false) return 'Firefox';
        if (strpos($userAgent, 'Chrome') !== false) return 'Chrome';
        if (strpos($userAgent, 'Safari') !== false) return 'Safari';
        if (strpos($userAgent, 'Edge') !== false) return 'Edge';
        if (strpos($userAgent, 'Opera') !== false || strpos($userAgent, 'OPR') !== false) return 'Opera';
        if (strpos($userAgent, 'Trident') !== false) return 'Internet Explorer';
        return 'Otro';
    }

    /**
     * Detectar tipo de dispositivo desde User Agent
     */
    private function detectarDispositivo($userAgent)
    {
        if (preg_match('/(tablet|ipad|playbook)|(android(?!.*(mobi|opera mini)))/i', $userAgent)) {
            return 'tablet';
        }
        if (preg_match('/(up.browser|up.link|mmp|symbian|smartphone|midp|wap|phone|android|iemobile)/i', $userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }
}
