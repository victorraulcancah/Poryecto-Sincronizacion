<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserHorario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;        

class HorariosController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['horarios' => function($q) {
            $q->where('activo', true)
              ->whereNull('fecha_especial')
              ->orderBy('dia_semana')
              ->orderBy('hora_inicio');
        }, 'roles', 'profile']);

        // Filtrar por rol si se especifica
        if ($request->has('rol')) {
            $query->whereHas('roles', function($q) use ($request) {
                $q->where('name', $request->rol);
            });
        }

        // Solo usuarios activos
        $query->where('is_enabled', true);

        $usuarios = $query->get();

        return response()->json([
            'usuarios' => $usuarios,
            'disponibles_ahora' => $usuarios->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'disponible' => $user->isDisponibleAhora()
                ];
            })
        ]);
    }

    public function show($userId)
    {
        try {
            $usuario = User::with(['horarios' => function($q) {
                $q->where('activo', true)
                  ->orderBy('fecha_especial', 'desc')
                  ->orderBy('dia_semana')
                  ->orderBy('hora_inicio');
            }, 'roles', 'profile'])->findOrFail($userId);

            $horariosAgrupados = [
                'regulares' => $usuario->horarios->whereNull('fecha_especial')->groupBy('dia_semana'),
                'excepciones' => $usuario->horarios->whereNotNull('fecha_especial')
            ];

            return response()->json([
                'usuario' => $usuario,
                'horarios' => $horariosAgrupados,
                'disponible_ahora' => $usuario->isDisponibleAhora()
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Usuario no encontrado'], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            // \Log::info('=== DEBUG CREAR HORARIO ===');
            // \Log::info('Datos recibidos:', $request->all());
            
            $request->validate([
                'user_id' => 'required|exists:users,id',
                'dia_semana' => 'required|in:lunes,martes,miercoles,jueves,viernes,sabado,domingo',
                'hora_inicio' => 'required',
                'hora_fin' => 'required',
                'es_descanso' => 'boolean',
                'fecha_especial' => 'nullable|date',
                'comentarios' => 'nullable|string',
                'activo' => 'boolean'
            ]);

            // Crear el horario sin validación de hora_fin > hora_inicio
            $horario = UserHorario::create([
                'user_id' => $request->user_id,
                'dia_semana' => $request->dia_semana,
                'hora_inicio' => $request->hora_inicio,
                'hora_fin' => $request->hora_fin,
                'es_descanso' => $request->es_descanso ?? false,
                'fecha_especial' => $request->fecha_especial,
                'comentarios' => $request->comentarios,
                'activo' => $request->activo ?? true
            ]);

            // \Log::info('Horario creado exitosamente:', $horario->toArray());

            return response()->json([
                'message' => 'Horario creado correctamente',
                'horario' => $horario
            ], 201);

        } catch (\Exception $e) {
            // \Log::error('Error al crear horario:', [
            //     'error' => $e->getMessage(),
            //     'trace' => $e->getTraceAsString(),
            //     'request_data' => $request->all()
            // ]);
            
            return response()->json([
                'error' => 'Error al crear horario: ' . $e->getMessage()
            ], 500);
        }
    }


    public function update(Request $request, $id)
    {
        try {
            $horario = UserHorario::findOrFail($id);
            
            // Verificar permisos
            if (!auth()->user()->can('horarios.edit')) {
                return response()->json(['error' => 'No tienes permisos para editar horarios'], 403);
            }

            $request->validate([
                'dia_semana' => 'required|in:lunes,martes,miercoles,jueves,viernes,sabado,domingo',
                'hora_inicio' => 'required', // Sin date_format
                'hora_fin' => 'required|after:hora_inicio',
                'es_descanso' => 'boolean',
                'fecha_especial' => 'nullable|date',
                'comentarios' => 'nullable|string|max:500',
                'activo' => 'boolean'
            ]);

            // Validar solapamiento solo si no es descanso
            if (!$request->es_descanso) {
                $solapamiento = UserHorario::validarSolapamiento(
                    $horario->user_id,
                    $request->dia_semana,
                    $request->hora_inicio,
                    $request->hora_fin,
                    $id, // Excluir el horario actual
                    $request->fecha_especial
                );

                if ($solapamiento) {
                    return response()->json([
                        'error' => 'Ya existe un horario que se solapa con el horario especificado'
                    ], 422);
                }
            }

            $horario->update($request->all());

            return response()->json([
                'message' => 'Horario actualizado correctamente',
                'horario' => $horario
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al actualizar el horario: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            // Cargar el horario con la relación user
            $horario = UserHorario::with('user')->findOrFail($id);
            
            // Verificar permisos
            if (!auth()->user()->can('horarios.delete')) {
                return response()->json(['error' => 'No tienes permisos para eliminar horarios'], 403);
            }

            $nombreUsuario = $horario->user->name;
            $diaHorario = $horario->dia_semana;
            
            $horario->delete();

            return response()->json([
                'message' => "Horario de {$nombreUsuario} para {$diaHorario} eliminado correctamente"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al eliminar el horario: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Copiar horarios de un usuario a otro
     */
    public function copiarHorarios(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'usuario_origen_id' => 'required|exists:users,id',
            'usuario_destino_id' => 'required|exists:users,id|different:usuario_origen_id',
            'sobrescribir' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Datos inválidos',
                'details' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Si se debe sobrescribir, eliminar horarios existentes
            if ($request->get('sobrescribir', false)) {
                UserHorario::where('user_id', $request->usuario_destino_id)
                    ->whereNull('fecha_especial')
                    ->delete();
            }

            // Obtener horarios regulares del usuario origen
            $horariosOrigen = UserHorario::where('user_id', $request->usuario_origen_id)
                ->whereNull('fecha_especial')
                ->where('activo', true)
                ->get();

            $horariosCopiados = 0;
            foreach ($horariosOrigen as $horarioOrigen) {
                // Verificar si ya existe un horario similar
                $existe = UserHorario::where('user_id', $request->usuario_destino_id)
                    ->where('dia_semana', $horarioOrigen->dia_semana)
                    ->where('hora_inicio', $horarioOrigen->hora_inicio)
                    ->where('hora_fin', $horarioOrigen->hora_fin)
                    ->whereNull('fecha_especial')
                    ->exists();

                if (!$existe) {
                    UserHorario::create([
                        'user_id' => $request->usuario_destino_id,
                        'dia_semana' => $horarioOrigen->dia_semana,
                        'hora_inicio' => $horarioOrigen->hora_inicio,
                        'hora_fin' => $horarioOrigen->hora_fin,
                        'es_descanso' => $horarioOrigen->es_descanso,
                        'comentarios' => $horarioOrigen->comentarios,
                        'activo' => true
                    ]);
                    $horariosCopiados++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => "Se copiaron {$horariosCopiados} horarios exitosamente"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al copiar horarios'], 500);
        }
    }

  public function asesorDisponibles()
    {
        // Usar zona horaria de Lima
        $ahora = Carbon::now('America/Lima');
        
        // Log::info('=== VERIFICANDO ASESORES DISPONIBLES ===');
        // Log::info('Hora actual Lima: ' . $ahora->format('Y-m-d H:i:s T'));
        // Log::info('Día de la semana: ' . $ahora->dayOfWeek . ' (' . $ahora->format('l') . ')');
        
        $usuarios = User::whereHas('roles', function($query) {
            $query->where('name', 'vendedor');
        })
        ->where('is_enabled', true)
        ->with(['profile', 'horarios' => function($q) {
            $q->where('activo', true);
        }])
        ->get();

        // Log::info('Usuarios vendedor encontrados: ' . $usuarios->count());

        $asesorDisponibles = [];
        
        foreach ($usuarios as $usuario) {
            // Pasar la hora de Lima al método
            $disponible = UserHorario::estaDisponible($usuario->id, $ahora);
            
            // Log::info("Usuario {$usuario->id} ({$usuario->name}): " . ($disponible ? 'DISPONIBLE' : 'NO DISPONIBLE'));
            // Log::info("Horarios del usuario: " . $usuario->horarios->toJson());
            
            if ($disponible) {
                $asesorDisponibles[] = [
                    'id' => $usuario->id,
                    'name' => $usuario->name,
                    'email' => $usuario->email,
                    'telefono' => $usuario->profile->phone ?? null,
                    'avatar' => $usuario->profile->avatar_url ?? null,
                    'disponible' => true
                ];
            }
        }

        // Log::info('Asesores disponibles finales: ' . count($asesorDisponibles));
        
        return response()->json([
            'asesores_disponibles' => $asesorDisponibles,
            'debug_info' => [
                'hora_servidor' => $ahora->format('Y-m-d H:i:s T'),
                'timezone' => config('app.timezone')
            ]
        ]);
    }



    /**
     * Obtener plantillas de horarios
     */
    public function plantillasHorarios()
    {
        $plantillas = [
            'full_time' => [
                'nombre' => 'Tiempo Completo',
                'horarios' => [
                    ['dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '17:00'],
                    ['dia_semana' => 'martes', 'hora_inicio' => '08:00', 'hora_fin' => '17:00'],
                    ['dia_semana' => 'miercoles', 'hora_inicio' => '08:00', 'hora_fin' => '17:00'],
                    ['dia_semana' => 'jueves', 'hora_inicio' => '08:00', 'hora_fin' => '17:00'],
                    ['dia_semana' => 'viernes', 'hora_inicio' => '08:00', 'hora_fin' => '17:00']
                ]
            ],
            'medio_tiempo' => [
                'nombre' => 'Medio Tiempo',
                'horarios' => [
                    ['dia_semana' => 'lunes', 'hora_inicio' => '08:00', 'hora_fin' => '12:00'],
                    ['dia_semana' => 'martes', 'hora_inicio' => '08:00', 'hora_fin' => '12:00'],
                    ['dia_semana' => 'miercoles', 'hora_inicio' => '08:00', 'hora_fin' => '12:00'],
                    ['dia_semana' => 'jueves', 'hora_inicio' => '08:00', 'hora_fin' => '12:00'],
                    ['dia_semana' => 'viernes', 'hora_inicio' => '08:00', 'hora_fin' => '12:00']
                ]
            ],
            'noche' => [
                'nombre' => 'Turno Noche',
                'horarios' => [
                    ['dia_semana' => 'lunes', 'hora_inicio' => '18:00', 'hora_fin' => '02:00'],
                    ['dia_semana' => 'martes', 'hora_inicio' => '18:00', 'hora_fin' => '02:00'],
                    ['dia_semana' => 'miercoles', 'hora_inicio' => '18:00', 'hora_fin' => '02:00'],
                    ['dia_semana' => 'jueves', 'hora_inicio' => '18:00', 'hora_fin' => '02:00'],
                    ['dia_semana' => 'viernes', 'hora_inicio' => '18:00', 'hora_fin' => '02:00']
                ]
            ]
        ];

        return response()->json(['plantillas' => $plantillas]);
    }

   public function eliminarHorariosUsuario(Request $request)
    {
        try {
            // \Log::info('=== ELIMINANDO HORARIOS USUARIO ===');
            // \Log::info('Datos recibidos:', $request->all());
            
            $request->validate([
                'user_id' => 'required|exists:users,id',
                'dias' => 'required|array',
                'dias.*' => 'in:lunes,martes,miercoles,jueves,viernes,sabado,domingo'
            ]);

            $deletedCount = UserHorario::where('user_id', $request->user_id)
                ->whereIn('dia_semana', $request->dias)
                ->whereNull('fecha_especial')
                ->delete();

            // \Log::info("Horarios eliminados: {$deletedCount}");

            return response()->json([
                'message' => 'Horarios eliminados correctamente',
                'deleted_count' => $deletedCount
            ]);

        } catch (\Exception $e) {
            // \Log::error('Error eliminando horarios:', [
            //     'error' => $e->getMessage(),
            //     'trace' => $e->getTraceAsString()
            // ]);
            
            return response()->json([
                'error' => 'Error al eliminar horarios: ' . $e->getMessage()
            ], 500);
        }
    }


}
