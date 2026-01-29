<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class RecompensaHistorial extends Model
{
    use HasFactory;

    protected $table = 'recompensas_historial';

    protected $fillable = [
        'recompensa_id',
        'cliente_id',
        'pedido_id',
        'puntos_otorgados',
        'beneficio_aplicado',
        'fecha_aplicacion'
    ];

    protected $casts = [
        'puntos_otorgados' => 'decimal:2',
        'fecha_aplicacion' => 'datetime'
    ];

    public $timestamps = false;

    // Relaciones

    /**
     * Recompensa aplicada
     */
    public function recompensa(): BelongsTo
    {
        return $this->belongsTo(Recompensa::class);
    }

    /**
     * Cliente que recibió la recompensa
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(UserCliente::class, 'cliente_id');
    }

    /**
     * Pedido asociado (si aplica)
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    // Scopes

    /**
     * Scope para historial de un cliente específico
     */
    public function scopePorCliente($query, $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    /**
     * Scope para historial de una recompensa específica
     */
    public function scopePorRecompensa($query, $recompensaId)
    {
        return $query->where('recompensa_id', $recompensaId);
    }

    /**
     * Scope para historial de un pedido específico
     */
    public function scopePorPedido($query, $pedidoId)
    {
        return $query->where('pedido_id', $pedidoId);
    }

    /**
     * Scope para historial con puntos otorgados
     */
    public function scopeConPuntos($query)
    {
        return $query->where('puntos_otorgados', '>', 0);
    }

    /**
     * Scope para historial sin puntos (otros beneficios)
     */
    public function scopeSinPuntos($query)
    {
        return $query->where('puntos_otorgados', '<=', 0)->orWhereNull('puntos_otorgados');
    }

    /**
     * Scope para historial en un rango de fechas
     */
    public function scopeEntreFechas($query, $fechaInicio, $fechaFin)
    {
        return $query->whereBetween('fecha_aplicacion', [$fechaInicio, $fechaFin]);
    }

    /**
     * Scope para historial del mes actual
     */
    public function scopeMesActual($query)
    {
        $inicio = Carbon::now()->startOfMonth();
        $fin = Carbon::now()->endOfMonth();
        return $query->entreFechas($inicio, $fin);
    }

    /**
     * Scope para historial del año actual
     */
    public function scopeAnioActual($query)
    {
        $inicio = Carbon::now()->startOfYear();
        $fin = Carbon::now()->endOfYear();
        return $query->entreFechas($inicio, $fin);
    }

    // Accessors

    /**
     * Verifica si otorgó puntos
     */
    public function getOtorgoPuntosAttribute(): bool
    {
        return !is_null($this->puntos_otorgados) && $this->puntos_otorgados > 0;
    }

    /**
     * Verifica si tiene beneficio aplicado
     */
    public function getTieneBeneficioAttribute(): bool
    {
        return !is_null($this->beneficio_aplicado) && !empty(trim($this->beneficio_aplicado));
    }

    /**
     * Verifica si está asociado a un pedido
     */
    public function getTienePedidoAttribute(): bool
    {
        return !is_null($this->pedido_id);
    }

    /**
     * Obtiene el nombre del cliente
     */
    public function getNombreClienteAttribute(): string
    {
        if ($this->cliente) {
            return $this->cliente->nombres . ' ' . $this->cliente->apellidos;
        }
        return 'Cliente no encontrado';
    }

    /**
     * Obtiene el nombre de la recompensa
     */
    public function getNombreRecompensaAttribute(): string
    {
        return $this->recompensa ? $this->recompensa->nombre : 'Recompensa no encontrada';
    }

    /**
     * Obtiene el tipo de recompensa
     */
    public function getTipoRecompensaAttribute(): string
    {
        return $this->recompensa ? $this->recompensa->tipo : 'Desconocido';
    }

    /**
     * Obtiene el código del pedido (si existe)
     */
    public function getCodigoPedidoAttribute(): string
    {
        return $this->pedido ? $this->pedido->codigo_pedido : 'N/A';
    }

    /**
     * Obtiene una descripción completa del historial
     */
    public function getDescripcionCompletaAttribute(): string
    {
        $descripcion = "Recompensa '{$this->nombre_recompensa}' aplicada a {$this->nombre_cliente}";
        
        if ($this->otorgo_puntos) {
            $descripcion .= " - Puntos otorgados: {$this->puntos_otorgados}";
        }
        
        if ($this->tiene_beneficio) {
            $descripcion .= " - Beneficio: {$this->beneficio_aplicado}";
        }
        
        if ($this->tiene_pedido) {
            $descripcion .= " - Pedido: {$this->codigo_pedido}";
        }
        
        return $descripcion;
    }

    /**
     * Obtiene el tiempo transcurrido desde la aplicación
     */
    public function getTiempoTranscurridoAttribute(): string
    {
        return $this->fecha_aplicacion->diffForHumans();
    }

    // Métodos de utilidad

    /**
     * Obtiene estadísticas de un cliente
     */
    public static function getEstadisticasCliente($clienteId): array
    {
        $historial = self::porCliente($clienteId);
        
        return [
            'total_recompensas' => $historial->count(),
            'total_puntos_ganados' => $historial->sum('puntos_otorgados'),
            'recompensas_mes_actual' => $historial->mesActual()->count(),
            'puntos_mes_actual' => $historial->mesActual()->sum('puntos_otorgados'),
            'recompensas_ano_actual' => $historial->anioActual()->count(),
            'puntos_ano_actual' => $historial->anioActual()->sum('puntos_otorgados'),
            'primera_recompensa' => $historial->orderBy('fecha_aplicacion')->first()?->fecha_aplicacion,
            'ultima_recompensa' => $historial->orderBy('fecha_aplicacion', 'desc')->first()?->fecha_aplicacion
        ];
    }

    /**
     * Obtiene estadísticas de una recompensa
     */
    public static function getEstadisticasRecompensa($recompensaId): array
    {
        $historial = self::porRecompensa($recompensaId);
        
        return [
            'total_aplicaciones' => $historial->count(),
            'clientes_beneficiados' => $historial->distinct('cliente_id')->count(),
            'total_puntos_otorgados' => $historial->sum('puntos_otorgados'),
            'aplicaciones_mes_actual' => $historial->mesActual()->count(),
            'aplicaciones_ano_actual' => $historial->anioActual()->count(),
            'primera_aplicacion' => $historial->orderBy('fecha_aplicacion')->first()?->fecha_aplicacion,
            'ultima_aplicacion' => $historial->orderBy('fecha_aplicacion', 'desc')->first()?->fecha_aplicacion
        ];
    }

    /**
     * Obtiene el top de clientes por recompensas
     */
    public static function getTopClientesPorRecompensas($limite = 10): array
    {
        return self::selectRaw('cliente_id, COUNT(*) as total_recompensas, SUM(puntos_otorgados) as total_puntos')
            ->with('cliente')
            ->groupBy('cliente_id')
            ->orderBy('total_recompensas', 'desc')
            ->limit($limite)
            ->get()
            ->map(function ($item) {
                return [
                    'cliente_id' => $item->cliente_id,
                    'nombre_cliente' => $item->nombre_cliente,
                    'total_recompensas' => $item->total_recompensas,
                    'total_puntos' => $item->total_puntos ?? 0
                ];
            })
            ->toArray();
    }

    /**
     * Obtiene el historial resumido por tipo de recompensa
     */
    public static function getResumenPorTipo(): array
    {
        return self::join('recompensas', 'recompensas_historial.recompensa_id', '=', 'recompensas.id')
            ->selectRaw('recompensas.tipo, COUNT(*) as total_aplicaciones, SUM(puntos_otorgados) as total_puntos')
            ->groupBy('recompensas.tipo')
            ->orderBy('total_aplicaciones', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'tipo' => $item->tipo,
                    'total_aplicaciones' => $item->total_aplicaciones,
                    'total_puntos' => $item->total_puntos ?? 0
                ];
            })
            ->toArray();
    }

    /**
     * Registra una nueva aplicación de recompensa
     */
    public static function registrarAplicacion(
        int $recompensaId,
        int $clienteId,
        ?int $pedidoId = null,
        ?float $puntosOtorgados = null,
        ?string $beneficioAplicado = null
    ): self {
        return self::create([
            'recompensa_id' => $recompensaId,
            'cliente_id' => $clienteId,
            'pedido_id' => $pedidoId,
            'puntos_otorgados' => $puntosOtorgados,
            'beneficio_aplicado' => $beneficioAplicado,
            'fecha_aplicacion' => now()
        ]);
    }

    /**
     * Obtiene información completa del registro
     */
    public function getInformacionCompleta(): array
    {
        return [
            'id' => $this->id,
            'recompensa' => [
                'id' => $this->recompensa_id,
                'nombre' => $this->nombre_recompensa,
                'tipo' => $this->tipo_recompensa
            ],
            'cliente' => [
                'id' => $this->cliente_id,
                'nombre' => $this->nombre_cliente
            ],
            'pedido' => [
                'id' => $this->pedido_id,
                'codigo' => $this->codigo_pedido,
                'asociado' => $this->tiene_pedido
            ],
            'beneficios' => [
                'puntos_otorgados' => $this->puntos_otorgados,
                'beneficio_aplicado' => $this->beneficio_aplicado,
                'otorgo_puntos' => $this->otorgo_puntos,
                'tiene_beneficio' => $this->tiene_beneficio
            ],
            'fecha' => [
                'aplicacion' => $this->fecha_aplicacion,
                'tiempo_transcurrido' => $this->tiempo_transcurrido
            ],
            'descripcion' => $this->descripcion_completa
        ];
    }
}