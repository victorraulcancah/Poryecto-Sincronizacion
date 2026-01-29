<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class StandardizeApiResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Solo procesar respuestas JSON de APIs de recompensas
        if ($response instanceof JsonResponse && 
            (str_contains($request->path(), 'api/admin/recompensas') || 
             str_contains($request->path(), 'api/cliente/recompensas'))) {
            
            $data = $response->getData(true);
            
            // Estandarizar estructura de respuesta
            $standardized = $this->standardizeResponse($data, $response->getStatusCode());
            
            $response->setData($standardized);
        }

        return $response;
    }

    /**
     * Estandarizar la estructura de respuesta
     */
    private function standardizeResponse(array $data, int $statusCode): array
    {
        $standardized = [
            'success' => $statusCode >= 200 && $statusCode < 300,
            'status_code' => $statusCode,
            'timestamp' => now()->toISOString(),
        ];

        // Preservar campos existentes si ya están en formato estándar
        if (isset($data['success'])) {
            $standardized['success'] = $data['success'];
        }

        if (isset($data['message'])) {
            $standardized['message'] = $data['message'];
        } else {
            $standardized['message'] = $this->getDefaultMessage($statusCode);
        }

        // Datos principales
        if (isset($data['data'])) {
            $standardized['data'] = $data['data'];
        } elseif (!isset($data['success']) && !isset($data['error']) && !isset($data['current_page'])) {
            // Si no hay estructura estándar y no es paginación, asumir que todo el array es data
            $standardized['data'] = $data;
        } else {
            $standardized['data'] = null;
        }

        // Errores
        if (isset($data['errors'])) {
            $standardized['errors'] = $data['errors'];
        }

        if (isset($data['error'])) {
            $standardized['error'] = $data['error'];
        }

        // Metadatos adicionales
        $standardized['meta'] = [
            'response_time' => round((microtime(true) - LARAVEL_START) * 1000, 2) . 'ms',
            'version' => '1.0',
            'endpoint' => request()->path()
        ];

        // Preservar metadatos existentes
        if (isset($data['meta'])) {
            $standardized['meta'] = array_merge($standardized['meta'], $data['meta']);
        }

        if (isset($data['metadata'])) {
            $standardized['meta'] = array_merge($standardized['meta'], $data['metadata']);
        }

        // Información de paginación si existe
        if (isset($data['links']) || isset($data['current_page'])) {
            $standardized['pagination'] = [
                'current_page' => $data['current_page'] ?? 1,
                'last_page' => $data['last_page'] ?? 1,
                'per_page' => $data['per_page'] ?? 15,
                'total' => $data['total'] ?? 0,
                'from' => $data['from'] ?? null,
                'to' => $data['to'] ?? null,
                'links' => $data['links'] ?? []
            ];
            
            // Si hay paginación y no se ha establecido data, usar los datos paginados
            if ($standardized['data'] === null && isset($data['data'])) {
                $standardized['data'] = $data['data'];
            }
        }

        return $standardized;
    }

    /**
     * Obtener mensaje por defecto según código de estado
     */
    private function getDefaultMessage(int $statusCode): string
    {
        return match($statusCode) {
            200 => 'Operación exitosa',
            201 => 'Recurso creado exitosamente',
            204 => 'Operación completada sin contenido',
            400 => 'Solicitud incorrecta',
            401 => 'No autorizado',
            403 => 'Acceso denegado',
            404 => 'Recurso no encontrado',
            422 => 'Error de validación',
            500 => 'Error interno del servidor',
            default => 'Operación completada'
        };
    }
}
