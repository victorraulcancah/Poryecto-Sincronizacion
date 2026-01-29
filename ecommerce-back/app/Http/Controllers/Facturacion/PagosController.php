<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Comprobante;
use App\Models\Pago;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PagosController extends Controller
{
    /**
     * Listar pagos
     */
    public function index(Request $request)
    {
        try {
            $query = Pago::with(['comprobante', 'user']);

            // Filtros
            if ($request->filled('comprobante_id')) {
                $query->where('comprobante_id', $request->comprobante_id);
            }

            if ($request->filled('metodo_pago')) {
                $query->where('metodo_pago', $request->metodo_pago);
            }

            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            if ($request->filled('fecha_desde')) {
                $query->whereDate('fecha_pago', '>=', $request->fecha_desde);
            }

            if ($request->filled('fecha_hasta')) {
                $query->whereDate('fecha_pago', '<=', $request->fecha_hasta);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('referencia_pago', 'LIKE', "%{$search}%")
                      ->orWhereHas('comprobante', function ($q) use ($search) {
                          $q->where('numero_completo', 'LIKE', "%{$search}%");
                      });
                });
            }

            $pagos = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $pagos
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener pagos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener pagos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar detalle de un pago
     */
    public function show($id)
    {
        try {
            $pago = Pago::with(['comprobante', 'user'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $pago
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pago no encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Registrar un nuevo pago
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'comprobante_id' => 'required|exists:comprobantes,id',
            'metodo_pago' => 'required|in:efectivo,tarjeta,transferencia,credito,yape,plin,culqi',
            'monto' => 'required|numeric|min:0.01',
            'fecha_pago' => 'required|date',
            'referencia_pago' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de pago inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $comprobante = Comprobante::findOrFail($request->comprobante_id);

            // Validar que el monto no exceda el saldo pendiente
            $montoPagado = $comprobante->pagos()->sum('monto');
            $saldoPendiente = $comprobante->importe_total - $montoPagado;

            if ($request->monto > $saldoPendiente) {
                throw new \Exception("El monto del pago ({$request->monto}) excede el saldo pendiente ({$saldoPendiente})");
            }

            // Crear el pago
            $pago = Pago::create([
                'comprobante_id' => $comprobante->id,
                'metodo_pago' => $request->metodo_pago,
                'monto' => $request->monto,
                'fecha_pago' => $request->fecha_pago,
                'referencia_pago' => $request->referencia_pago,
                'observaciones' => $request->observaciones,
                'estado' => 'completado',
                'user_id' => Auth::check() ? Auth::id() : 1
            ]);

            // Verificar si el comprobante está completamente pagado
            $totalPagado = $comprobante->pagos()->sum('monto');
            if ($totalPagado >= $comprobante->importe_total) {
                $comprobante->update(['estado_pago' => 'pagado']);
            } else {
                $comprobante->update(['estado_pago' => 'parcial']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pago registrado exitosamente',
                'data' => $pago->load('comprobante')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar pago: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un pago
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'estado' => 'nullable|in:pendiente,completado,fallido,reembolsado',
            'observaciones' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $pago = Pago::findOrFail($id);

            $pago->update($request->only(['estado', 'observaciones']));

            return response()->json([
                'success' => true,
                'message' => 'Pago actualizado exitosamente',
                'data' => $pago->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Error al actualizar pago: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Anular un pago
     */
    public function anular(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'motivo' => 'required|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Debe proporcionar un motivo de anulación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $pago = Pago::findOrFail($id);

            if ($pago->estado === 'anulado') {
                throw new \Exception('El pago ya está anulado');
            }

            $pago->update([
                'estado' => 'anulado',
                'observaciones' => ($pago->observaciones ?? '') . "\nAnulado: " . $request->motivo
            ]);

            // Actualizar estado de pago del comprobante
            $comprobante = $pago->comprobante;
            $totalPagado = $comprobante->pagos()->where('estado', 'completado')->sum('monto');

            if ($totalPagado >= $comprobante->importe_total) {
                $comprobante->update(['estado_pago' => 'pagado']);
            } elseif ($totalPagado > 0) {
                $comprobante->update(['estado_pago' => 'parcial']);
            } else {
                $comprobante->update(['estado_pago' => 'pendiente']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pago anulado exitosamente',
                'data' => $pago->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al anular pago: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al anular pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener pagos de un comprobante específico
     */
    public function pagosPorComprobante($comprobanteId)
    {
        try {
            $comprobante = Comprobante::findOrFail($comprobanteId);
            $pagos = $comprobante->pagos()->with('user')->orderBy('fecha_pago', 'desc')->get();

            $totalPagado = $pagos->where('estado', 'completado')->sum('monto');
            $saldoPendiente = $comprobante->importe_total - $totalPagado;

            return response()->json([
                'success' => true,
                'data' => [
                    'comprobante' => $comprobante,
                    'pagos' => $pagos,
                    'resumen' => [
                        'total_comprobante' => $comprobante->importe_total,
                        'total_pagado' => $totalPagado,
                        'saldo_pendiente' => $saldoPendiente,
                        'estado_pago' => $saldoPendiente <= 0 ? 'pagado' : ($totalPagado > 0 ? 'parcial' : 'pendiente')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener pagos del comprobante',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estadísticas de pagos
     */
    public function estadisticas(Request $request)
    {
        try {
            $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->format('Y-m-d');
            $fechaFin = $request->fecha_fin ?? now()->format('Y-m-d');

            $estadisticas = [
                'total_pagos' => Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])
                    ->where('estado', 'completado')
                    ->count(),

                'monto_total' => Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])
                    ->where('estado', 'completado')
                    ->sum('monto'),

                'por_metodo' => Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])
                    ->where('estado', 'completado')
                    ->selectRaw('metodo_pago, COUNT(*) as cantidad, SUM(monto) as monto_total')
                    ->groupBy('metodo_pago')
                    ->get(),

                'por_estado' => Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])
                    ->selectRaw('estado, COUNT(*) as cantidad, SUM(monto) as monto_total')
                    ->groupBy('estado')
                    ->get(),

                'promedio_pago' => Pago::whereBetween('fecha_pago', [$fechaInicio, $fechaFin])
                    ->where('estado', 'completado')
                    ->avg('monto'),

                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener estadísticas de pagos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Registrar pago con validación de pasarela
     */
    public function registrarPagoExterno(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'comprobante_id' => 'required|exists:comprobantes,id',
            'metodo_pago' => 'required|in:culqi,mercadopago,paypal,niubiz',
            'monto' => 'required|numeric|min:0.01',
            'transaction_id' => 'required|string|max:100',
            'payment_data' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de pago inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $comprobante = Comprobante::findOrFail($request->comprobante_id);

            // Crear el pago
            $pago = Pago::create([
                'comprobante_id' => $comprobante->id,
                'metodo_pago' => $request->metodo_pago,
                'monto' => $request->monto,
                'fecha_pago' => now(),
                'referencia_pago' => $request->transaction_id,
                'metadata' => json_encode($request->payment_data),
                'estado' => 'completado',
                'user_id' => Auth::check() ? Auth::id() : 1
            ]);

            // Actualizar estado de pago del comprobante
            $totalPagado = $comprobante->pagos()->where('estado', 'completado')->sum('monto');
            if ($totalPagado >= $comprobante->importe_total) {
                $comprobante->update(['estado_pago' => 'pagado']);
            } else {
                $comprobante->update(['estado_pago' => 'parcial']);
            }

            DB::commit();

            Log::info('Pago externo registrado', [
                'pago_id' => $pago->id,
                'comprobante_id' => $comprobante->id,
                'metodo' => $request->metodo_pago,
                'transaction_id' => $request->transaction_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pago registrado exitosamente',
                'data' => $pago->load('comprobante')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar pago externo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
