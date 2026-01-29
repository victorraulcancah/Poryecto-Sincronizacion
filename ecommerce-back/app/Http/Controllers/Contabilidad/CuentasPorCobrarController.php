<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\CuentaPorCobrar;
use App\Models\CxcPago;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CuentasPorCobrarController extends Controller
{
    public function index(Request $request)
    {
        $query = CuentaPorCobrar::with(['cliente', 'venta', 'comprobante', 'pagos']);

        if ($request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->cliente_id) {
            $query->where('cliente_id', $request->cliente_id);
        }

        if ($request->vencidas) {
            $query->where('fecha_vencimiento', '<', now()->toDateString())
                ->whereIn('estado', ['PENDIENTE', 'PARCIAL']);
        }

        $cuentas = $query->orderBy('fecha_vencimiento')->paginate(20);

        return response()->json($cuentas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'numero_documento' => 'required|string',
            'fecha_emision' => 'required|date',
            'fecha_vencimiento' => 'required|date',
            'monto_total' => 'required|numeric|min:0',
            'dias_credito' => 'required|integer|min:0'
        ]);

        $cuenta = CuentaPorCobrar::create([
            ...$request->all(),
            'saldo_pendiente' => $request->monto_total,
            'user_id' => auth()->id()
        ]);

        return response()->json($cuenta, 201);
    }

    public function registrarPago(Request $request, $id)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0',
            'fecha_pago' => 'required|date',
            'metodo_pago' => 'required|string',
            'referencia' => 'nullable|string'
        ]);

        DB::beginTransaction();
        try {
            $cuenta = CuentaPorCobrar::findOrFail($id);

            if ($request->monto > $cuenta->saldo_pendiente) {
                return response()->json(['error' => 'El monto excede el saldo pendiente'], 400);
            }

            // Registrar pago
            CxcPago::create([
                'cuenta_por_cobrar_id' => $cuenta->id,
                'fecha_pago' => $request->fecha_pago,
                'monto' => $request->monto,
                'metodo_pago' => $request->metodo_pago,
                'referencia' => $request->referencia,
                'numero_operacion' => $request->numero_operacion,
                'observaciones' => $request->observaciones,
                'user_id' => auth()->id()
            ]);

            // Actualizar cuenta
            $montoPagado = $cuenta->monto_pagado + $request->monto;
            $saldoPendiente = $cuenta->monto_total - $montoPagado;

            $estado = 'PENDIENTE';
            if ($saldoPendiente == 0) {
                $estado = 'PAGADO';
            } elseif ($montoPagado > 0) {
                $estado = 'PARCIAL';
            }

            $cuenta->update([
                'monto_pagado' => $montoPagado,
                'saldo_pendiente' => $saldoPendiente,
                'estado' => $estado
            ]);

            DB::commit();
            return response()->json($cuenta);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $cuenta = CuentaPorCobrar::with(['cliente', 'venta', 'comprobante', 'pagos.user'])
            ->findOrFail($id);

        return response()->json($cuenta);
    }

    public function antiguedadSaldos()
    {
        $cuentas = CuentaPorCobrar::with('cliente')
            ->whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->get();

        $rangos = [
            '0-30' => 0,
            '31-60' => 0,
            '61-90' => 0,
            '91+' => 0
        ];

        $detalle = $cuentas->map(function ($cuenta) use (&$rangos) {
            $diasVencidos = Carbon::parse($cuenta->fecha_vencimiento)->diffInDays(now(), false);
            $cuenta->dias_vencidos = max(0, $diasVencidos);

            if ($diasVencidos <= 30) {
                $rangos['0-30'] += $cuenta->saldo_pendiente;
            } elseif ($diasVencidos <= 60) {
                $rangos['31-60'] += $cuenta->saldo_pendiente;
            } elseif ($diasVencidos <= 90) {
                $rangos['61-90'] += $cuenta->saldo_pendiente;
            } else {
                $rangos['91+'] += $cuenta->saldo_pendiente;
            }

            return $cuenta;
        });

        return response()->json([
            'detalle' => $detalle,
            'rangos' => $rangos,
            'total_pendiente' => $cuentas->sum('saldo_pendiente')
        ]);
    }

    public function getPagos($cuentaId)
    {
        $pagos = CxcPago::where('cuenta_por_cobrar_id', $cuentaId)
            ->with('user')
            ->orderBy('fecha_pago', 'desc')
            ->get();

        return response()->json($pagos);
    }
}
