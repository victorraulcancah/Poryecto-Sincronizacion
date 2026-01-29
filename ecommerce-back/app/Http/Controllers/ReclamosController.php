<?php

namespace App\Http\Controllers;

use App\Models\Reclamo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReclamosController extends Controller
{
    /**
     * Obtener todos los reclamos (para admin)
     */
    public function index(Request $request)
    {
        try {
            $query = Reclamo::with(['user_cliente:id,nombres,apellidos,email'])
                ->orderBy('created_at', 'desc');

            // Filtros
            if ($request->has('estado') && $request->estado) {
                $query->where('estado', $request->estado);
            }

            if ($request->has('tipo_solicitud') && $request->tipo_solicitud) {
                $query->where('tipo_solicitud', $request->tipo_solicitud);
            }

            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('numero_reclamo', 'LIKE', "%{$search}%")
                        ->orWhere('consumidor_nombre', 'LIKE', "%{$search}%")
                        ->orWhere('consumidor_dni', 'LIKE', "%{$search}%")
                        ->orWhere('consumidor_email', 'LIKE', "%{$search}%");
                });
            }

            if ($request->has('fecha_desde') && $request->fecha_desde) {
                $query->whereDate('created_at', '>=', $request->fecha_desde);
            }

            if ($request->has('fecha_hasta') && $request->fecha_hasta) {
                $query->whereDate('created_at', '<=', $request->fecha_hasta);
            }

            // Paginación
            $perPage = $request->get('per_page', 10);
            $reclamos = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'reclamos' => $reclamos->items(),
                'pagination' => [
                    'current_page' => $reclamos->currentPage(),
                    'last_page' => $reclamos->lastPage(),
                    'per_page' => $reclamos->perPage(),
                    'total' => $reclamos->total(),
                    'from' => $reclamos->firstItem(),
                    'to' => $reclamos->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener reclamos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo reclamo (público)
     */
    public function crear(Request $request)
    {
        try {
            // Validaciones básicas
            $rules = [
                // Datos del consumidor
                'consumidor_nombre' => 'required|string|min:2|max:255',
                'consumidor_dni' => 'required|string|size:8|regex:/^\d{8}$/',
                'consumidor_direccion' => 'required|string|min:10',
                'consumidor_telefono' => 'required|string|size:9|regex:/^\d{9}$/',
                'consumidor_email' => 'required|email|max:255',
                
                // Menor de edad
                'es_menor_edad' => 'boolean',
                
                // Identificación del bien contratado
                'tipo_bien' => 'required|in:producto,servicio',
                'monto_reclamado' => 'required|numeric|min:0.01',
                'descripcion_bien' => 'required|string|min:10',
                
                // Detalle de la reclamación
                'tipo_solicitud' => 'required|in:reclamo,queja',
                'detalle_reclamo' => 'required|string|min:20',
                'pedido_consumidor' => 'required|string|min:10'
            ];

            // Agregar validaciones del apoderado solo si es menor de edad
            if ($request->get('es_menor_edad', false)) {
                $rules['apoderado_nombre'] = 'required|string|min:2|max:255';
                $rules['apoderado_dni'] = 'required|string|size:8|regex:/^\d{8}$/';
                $rules['apoderado_direccion'] = 'required|string|min:10';
                $rules['apoderado_telefono'] = 'required|string|size:9|regex:/^\d{9}$/';
                $rules['apoderado_email'] = 'required|email|max:255';
            }

            $validator = Validator::make($request->all(), $rules, [
                'consumidor_nombre.required' => 'El nombre del consumidor es requerido',
                'consumidor_dni.required' => 'El DNI del consumidor es requerido',
                'consumidor_dni.size' => 'El DNI debe tener exactamente 8 dígitos',
                'consumidor_dni.regex' => 'El DNI solo debe contener números',
                'consumidor_telefono.size' => 'El teléfono debe tener exactamente 9 dígitos',
                'consumidor_telefono.regex' => 'El teléfono solo debe contener números',
                'consumidor_email.email' => 'El email no tiene un formato válido',
                'monto_reclamado.min' => 'El monto reclamado debe ser mayor a 0',
                'descripcion_bien.min' => 'La descripción debe tener al menos 10 caracteres',
                'detalle_reclamo.min' => 'El detalle del reclamo debe tener al menos 20 caracteres',
                'pedido_consumidor.min' => 'El pedido del consumidor debe tener al menos 10 caracteres'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Generar número único de reclamo
            $numeroReclamo = $this->generarNumeroReclamo();

            // Calcular fecha límite de respuesta (30 días calendario)
            $fechaLimiteRespuesta = Carbon::now()->addDays(30);

            // Preparar datos del reclamo
            $esMenorEdad = $request->get('es_menor_edad', false);
            
            // Intentar encontrar el usuario cliente por email si no está logueado
            $userClienteId = auth()->id();
            
            if (!$userClienteId) {
                // Buscar si existe un usuario con el email del consumidor
                $userCliente = \App\Models\UserCliente::where('email', $request->consumidor_email)->first();
                if ($userCliente) {
                    $userClienteId = $userCliente->id;
                }
            }

            $datosReclamo = [
                'numero_reclamo' => $numeroReclamo,
                'user_cliente_id' => $userClienteId,
                
                // Datos del consumidor
                'consumidor_nombre' => $request->consumidor_nombre,
                'consumidor_dni' => $request->consumidor_dni,
                'consumidor_direccion' => $request->consumidor_direccion,
                'consumidor_telefono' => $request->consumidor_telefono,
                'consumidor_email' => $request->consumidor_email,
                
                // Menor de edad
                'es_menor_edad' => $esMenorEdad,
                
                // Identificación del bien contratado
                'tipo_bien' => $request->tipo_bien,
                'monto_reclamado' => $request->monto_reclamado,
                'descripcion_bien' => $request->descripcion_bien,
                
                // Detalle de la reclamación
                'tipo_solicitud' => $request->tipo_solicitud,
                'detalle_reclamo' => $request->detalle_reclamo,
                'pedido_consumidor' => $request->pedido_consumidor,
                
                // Estados
                'estado' => 'pendiente',
                'fecha_limite_respuesta' => $fechaLimiteRespuesta
            ];

            // Agregar datos del apoderado solo si es menor de edad
            if ($esMenorEdad) {
                $datosReclamo['apoderado_nombre'] = $request->apoderado_nombre;
                $datosReclamo['apoderado_dni'] = $request->apoderado_dni;
                $datosReclamo['apoderado_direccion'] = $request->apoderado_direccion;
                $datosReclamo['apoderado_telefono'] = $request->apoderado_telefono;
                $datosReclamo['apoderado_email'] = $request->apoderado_email;
            } else {
                // Asegurar que los campos del apoderado sean null
                $datosReclamo['apoderado_nombre'] = null;
                $datosReclamo['apoderado_dni'] = null;
                $datosReclamo['apoderado_direccion'] = null;
                $datosReclamo['apoderado_telefono'] = null;
                $datosReclamo['apoderado_email'] = null;
            }

            // Crear el reclamo
            $reclamo = Reclamo::create($datosReclamo);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Reclamo registrado exitosamente',
                'reclamo' => [
                    'id' => $reclamo->id,
                    'numero_reclamo' => $reclamo->numero_reclamo,
                    'estado' => $reclamo->estado,
                    'fecha_limite_respuesta' => $reclamo->fecha_limite_respuesta,
                    'created_at' => $reclamo->created_at
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear el reclamo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener reclamos del usuario autenticado
     */
    public function misReclamos()
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Debug: Logear información del usuario
            \Log::info('Buscando reclamos para usuario:', [
                'user_id' => $user->id,
                'user_email' => $user->email
            ]);

            $reclamos = Reclamo::where('user_cliente_id', $user->id)
                ->orWhere('consumidor_email', $user->email)
                ->orderBy('created_at', 'desc')
                ->get();

            // Debug: Logear cuántos reclamos se encontraron
            \Log::info('Reclamos encontrados:', [
                'count' => $reclamos->count(),
                'reclamos' => $reclamos->toArray()
            ]);

            return response()->json([
                'status' => 'success',
                'reclamos' => $reclamos,
                'debug' => [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'total_reclamos' => $reclamos->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener reclamos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar un reclamo específico
     */
    public function show($id)
    {
        try {
            $reclamo = Reclamo::with(['user_cliente:id,nombres,apellidos,email'])->find($id);

            if (!$reclamo) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Reclamo no encontrado'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'reclamo' => $reclamo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener reclamo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar reclamo por número (público)
     */
    public function buscarPorNumero($numeroReclamo)
    {
        try {
            $reclamo = Reclamo::where('numero_reclamo', $numeroReclamo)->first();

            if (!$reclamo) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Reclamo no encontrado con el número proporcionado'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'reclamo' => [
                    'numero_reclamo' => $reclamo->numero_reclamo,
                    'estado' => $reclamo->estado,
                    'tipo_solicitud' => $reclamo->tipo_solicitud,
                    'fecha_limite_respuesta' => $reclamo->fecha_limite_respuesta,
                    'respuesta_proveedor' => $reclamo->respuesta_proveedor,
                    'fecha_respuesta' => $reclamo->fecha_respuesta,
                    'created_at' => $reclamo->created_at
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al buscar reclamo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar respuesta del proveedor (admin)
     */
    public function actualizarRespuesta(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'respuesta_proveedor' => 'required|string|min:10',
                'fecha_respuesta' => 'sometimes|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $reclamo = Reclamo::find($id);

            if (!$reclamo) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Reclamo no encontrado'
                ], 404);
            }

            $reclamo->update([
                'respuesta_proveedor' => $request->respuesta_proveedor,
                'fecha_respuesta' => $request->fecha_respuesta ?? now()->toDateString(),
                'estado' => 'resuelto'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Respuesta actualizada exitosamente',
                'reclamo' => $reclamo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar respuesta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado del reclamo (admin)
     */
    public function cambiarEstado(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'estado' => 'required|in:pendiente,en_proceso,resuelto,cerrado'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Estado inválido',
                    'errors' => $validator->errors()
                ], 422);
            }

            $reclamo = Reclamo::find($id);

            if (!$reclamo) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Reclamo no encontrado'
                ], 404);
            }

            $reclamo->update(['estado' => $request->estado]);

            return response()->json([
                'status' => 'success',
                'message' => 'Estado actualizado exitosamente',
                'reclamo' => $reclamo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar reclamo (admin)
     */
    public function destroy($id)
    {
        try {
            $reclamo = Reclamo::find($id);

            if (!$reclamo) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Reclamo no encontrado'
                ], 404);
            }

            $reclamo->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Reclamo eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al eliminar reclamo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de reclamos (admin)
     */
    public function estadisticas()
    {
        try {
            $stats = [
                'total_reclamos' => Reclamo::count(),
                'reclamos_pendientes' => Reclamo::where('estado', 'pendiente')->count(),
                'reclamos_proceso' => Reclamo::where('estado', 'en_proceso')->count(),
                'reclamos_resueltos' => Reclamo::where('estado', 'resuelto')->count(),
                'reclamos_cerrados' => Reclamo::where('estado', 'cerrado')->count(),
                'reclamos_mes_actual' => Reclamo::whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)->count(),
                'reclamos_vencidos' => Reclamo::where('fecha_limite_respuesta', '<', now()->toDateString())
                    ->whereIn('estado', ['pendiente', 'en_proceso'])->count()
            ];

            // Estadísticas por tipo
            $porTipo = Reclamo::select('tipo_solicitud', DB::raw('count(*) as total'))
                ->groupBy('tipo_solicitud')
                ->get();

            $stats['por_tipo'] = $porTipo;

            // Últimos 30 días
            $ultimosTreintaDias = Reclamo::select(
                DB::raw('DATE(created_at) as fecha'),
                DB::raw('count(*) as total')
            )
                ->where('created_at', '>=', now()->subDays(30))
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('fecha', 'desc')
                ->get();

            $stats['ultimos_30_dias'] = $ultimosTreintaDias;

            return response()->json([
                'status' => 'success',
                'estadisticas' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generar número único de reclamo
     */
    private function generarNumeroReclamo()
    {
        do {
            $year = date('Y');
            $month = date('m');
            $random = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $numero = "REC-{$year}{$month}-{$random}";
        } while (Reclamo::where('numero_reclamo', $numero)->exists());

        return $numero;
    }
}