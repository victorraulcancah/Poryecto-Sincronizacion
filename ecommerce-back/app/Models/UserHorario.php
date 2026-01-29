<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class UserHorario extends Model
{
    use HasFactory;

    protected $table = 'user_horarios';

    protected $fillable = [
        'user_id',
        'dia_semana',
        'hora_inicio',
        'hora_fin',
        'es_descanso',
        'fecha_especial',
        'comentarios',
        'activo'
    ];

    protected $casts = [
        'fecha_especial' => 'date',
        'es_descanso' => 'boolean',
        'activo' => 'boolean'
        // ← ELIMINADO: Los casts de hora_inicio y hora_fin
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Validar si hay solapamiento de horarios
     */
    public static function validarSolapamiento($userId, $diaSemana, $horaInicio, $horaFin, $excludeId = null, $fechaEspecial = null)
    {
        $query = self::where('user_id', $userId)
            ->where('dia_semana', $diaSemana)
            ->where('activo', true)
            ->where('es_descanso', false)
            ->where(function ($q) use ($horaInicio, $horaFin) {
                $q->where(function ($subQ) use ($horaInicio, $horaFin) {
                    // Caso 1: El nuevo horario empieza durante un turno existente
                    $subQ->where('hora_inicio', '<=', $horaInicio)
                         ->where('hora_fin', '>', $horaInicio);
                })->orWhere(function ($subQ) use ($horaInicio, $horaFin) {
                    // Caso 2: El nuevo horario termina durante un turno existente
                    $subQ->where('hora_inicio', '<', $horaFin)
                         ->where('hora_fin', '>=', $horaFin);
                })->orWhere(function ($subQ) use ($horaInicio, $horaFin) {
                    // Caso 3: El nuevo horario engloba completamente un turno existente
                    $subQ->where('hora_inicio', '>=', $horaInicio)
                         ->where('hora_fin', '<=', $horaFin);
                });
            });

        if ($fechaEspecial) {
            $query->where('fecha_especial', $fechaEspecial);
        } else {
            $query->whereNull('fecha_especial');
        }

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Obtener horarios de una semana específica
     */
    public static function obtenerHorariosSemana($userId, $fechaInicio = null)
    {
        if (!$fechaInicio) {
            $fechaInicio = Carbon::now()->startOfWeek();
        }

        return self::where('user_id', $userId)
            ->where('activo', true)
            ->whereNull('fecha_especial')
            ->orderBy('dia_semana')
            ->orderBy('hora_inicio')
            ->get()
            ->groupBy('dia_semana');
    }

    public static function estaDisponible($userId, $fechaHora = null)
    {
        if (!$fechaHora) {
            // Usar zona horaria de Lima explícitamente
            $fechaHora = Carbon::now('America/Lima');
        }

        $diaSemana = self::obtenerDiaSemanaEspanol($fechaHora->dayOfWeek);
        $hora = $fechaHora->format('H:i');
        $fecha = $fechaHora->format('Y-m-d');

        // Log::info("=== DEBUG DISPONIBILIDAD (ZONA HORARIA CORREGIDA) ===");
        // Log::info("Fecha/Hora Lima: {$fechaHora->format('Y-m-d H:i:s T')}");
        // Log::info("Usuario: {$userId}, Día: {$diaSemana}, Hora actual: {$hora}");

        // Verificar si hay excepción para fecha específica
        $excepcion = self::where('user_id', $userId)
            ->where('fecha_especial', $fecha)
            ->where('activo', true)
            ->first();

        if ($excepcion) {
            if ($excepcion->es_descanso) {
                // Log::info("Excepción: Es descanso");
                return false;
            }
            
            // ← CAMBIO: Extraer solo la hora de los campos
            $horaInicioExcepcion = self::extraerHora($excepcion->hora_inicio);
            $horaFinExcepcion = self::extraerHora($excepcion->hora_fin);
            
            $disponible = $hora >= $horaInicioExcepcion && $hora <= $horaFinExcepcion;
            // Log::info("Excepción encontrada: {$horaInicioExcepcion} - {$horaFinExcepcion}, Disponible: " . ($disponible ? 'SÍ' : 'NO'));
            return $disponible;
        }

        // Verificar horario regular
        $horarios = self::where('user_id', $userId)
            ->where('dia_semana', $diaSemana)
            ->where('activo', true)
            ->where('es_descanso', false)
            ->whereNull('fecha_especial')
            ->get();

        // Log::info("Horarios encontrados para {$diaSemana}: " . $horarios->count());

        foreach ($horarios as $horario) {
            // ← CAMBIO: Extraer solo la hora de los campos
            $horaInicioHorario = self::extraerHora($horario->hora_inicio);
            $horaFinHorario = self::extraerHora($horario->hora_fin);
            
            // Log::info("Verificando horario: {$horaInicioHorario} - {$horaFinHorario}");
            
            $disponible = $hora >= $horaInicioHorario && $hora <= $horaFinHorario;
            // Log::info("Comparación: {$hora} entre {$horaInicioHorario} y {$horaFinHorario} = " . ($disponible ? 'SÍ' : 'NO'));
            
            if ($disponible) {
                return true;
            }
        }

        // Log::info("No está disponible en ningún horario");
        return false;
    }

    /**
     * Extraer solo la hora de un campo que puede contener fecha completa o solo hora
     */
    private static function extraerHora($campo)
    {
        // Si contiene fecha completa (2025-07-13 02:27:00), extraer solo la hora
        if (strlen($campo) > 8) {
            return Carbon::parse($campo)->format('H:i');
        }
        
        // Si ya es solo hora (02:27), devolverla tal como está
        return substr($campo, 0, 5); // Asegurar formato H:i
    }

    /**
     * Convertir día de semana de número a texto en español
     */
    private static function obtenerDiaSemanaEspanol($dayOfWeek)
    {
        $dias = [
            0 => 'domingo',
            1 => 'lunes',
            2 => 'martes',
            3 => 'miercoles',
            4 => 'jueves',
            5 => 'viernes',
            6 => 'sabado'
        ];

        return $dias[$dayOfWeek];
    }
}
