<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\CuentaPorPagar;
use App\Models\CxpPago;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CuentasPorPagarController extends Controller
{
    public function index(Request $request)
    {
        $query = CuentaPorPagar::with(['proveedor', 'compra', 'pagos']);

        if ($request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->proveedor_id) {
            $query->where('proveedor_id', $request->proveedor_id);
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
            'proveedor_id' => 'required|exists:proveedores,id',
            'numero_documento' => 'required|string',
            'fecha_emision' => 'required|date',
            'fecha_vencimiento' => 'required|date',
            'monto_total' => 'required|numeric|min:0',
            'dias_credito' => 'required|integer|min:0'
        ]);

        $cuenta = CuentaPorPagar::create([
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
            $cuenta = CuentaPorPagar::findOrFail($id);

            if ($request->monto > $cuenta->saldo_pendiente) {
                return response()->json(['error' => 'El monto excede el saldo pendiente'], 400);
            }

            CxpPago::create([
                'cuenta_por_pagar_id' => $cuenta->id,
                'fecha_pago' => $request->fecha_pago,
                'monto' => $request->monto,
                'metodo_pago' => $request->metodo_pago,
                'referencia' => $request->referencia,
                'numero_operacion' => $request->numero_operacion,
                'observaciones' => $request->observaciones,
                'user_id' => auth()->id()
            ]);

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
        $cuenta = CuentaPorPagar::with(['proveedor', 'compra', 'pagos.user'])
            ->findOrFail($id);

        return response()->json($cuenta);
    }

    public function update(Request $request, $id)
    {
        $cuenta = CuentaPorPagar::findOrFail($id);

        $request->validate([
            'fecha_vencimiento' => 'date',
            'observaciones' => 'nullable|string'
        ]);

        $cuenta->update($request->only(['fecha_vencimiento', 'observaciones']));

        return response()->json($cuenta);
    }

    public function destroy($id)
    {
        $cuenta = CuentaPorPagar::findOrFail($id);

        if ($cuenta->monto_pagado > 0) {
            return response()->json(['error' => 'No se puede eliminar una cuenta con pagos registrados'], 400);
        }

        $cuenta->delete();

        return response()->json(['message' => 'Cuenta por pagar eliminada correctamente']);
    }

    public function antiguedadSaldos()
    {
        $cuentas = CuentaPorPagar::with('proveedor')
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

    public function getPagos($id)
    {
        $pagos = CxpPago::where('cuenta_por_pagar_id', $id)
            ->with('user')
            ->orderBy('fecha_pago', 'desc')
            ->get();

        return response()->json($pagos);
    }

    public function estadisticas()
    {
        $totalPendiente = CuentaPorPagar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->sum('saldo_pendiente');

        $vencidas = CuentaPorPagar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->where('fecha_vencimiento', '<', now()->toDateString())
            ->sum('saldo_pendiente');

        $porVencer = CuentaPorPagar::whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->where('fecha_vencimiento', '>=', now()->toDateString())
            ->where('fecha_vencimiento', '<=', now()->addDays(30)->toDateString())
            ->sum('saldo_pendiente');

        return response()->json([
            'total_pendiente' => $totalPendiente,
            'vencidas' => $vencidas,
            'por_vencer_30_dias' => $porVencer
        ]);
    }
}
