<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\Caja;
use App\Models\CajaMovimiento;
use App\Models\CajaTransaccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CajasController extends Controller
{
    // 1. Listar cajas
    public function index()
    {
        $cajas = Caja::with(['tienda', 'movimientoActual'])->get();
        return response()->json($cajas);
    }

    // 2. Crear caja (código automático CAJ-001)
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'tienda_id' => 'required|exists:tiendas,id',
            'activo' => 'sometimes|boolean'
        ]);

        // Generar código automático
        $ultimo = Caja::orderBy('id', 'desc')->first();
        $numero = $ultimo ? ($ultimo->id + 1) : 1;
        $codigo = 'CAJ-' . str_pad($numero, 3, '0', STR_PAD_LEFT);

        $caja = Caja::create([
            'nombre' => $request->nombre,
            'codigo' => $codigo,
            'tienda_id' => $request->tienda_id,
            'activo' => $request->activo ?? true
        ]);

        return response()->json($caja->load('tienda'), 201);
    }

    // 3. Ver detalle
    public function show($id)
    {
        $caja = Caja::with(['tienda', 'movimientoActual'])->findOrFail($id);
        return response()->json($caja);
    }

    // 4. Actualizar
    public function update(Request $request, $id)
    {
        $caja = Caja::findOrFail($id);

        $request->validate([
            'nombre' => 'sometimes|string|max:100',
            'tienda_id' => 'sometimes|exists:tiendas,id',
            'activo' => 'sometimes|boolean'
        ]);

        $caja->update($request->only(['nombre', 'tienda_id', 'activo']));

        return response()->json($caja->load('tienda'));
    }

    // 5. Cajas abiertas
    public function abiertas()
    {
        $cajas = Caja::with(['tienda', 'movimientoActual.user'])
            ->whereHas('movimientoActual')
            ->get();

        return response()->json($cajas);
    }

    // 6. Estado actual
    public function estado($id)
    {
        $caja = Caja::with('movimientoActual')->findOrFail($id);
        
        $estado = [
            'caja_id' => $caja->id,
            'nombre' => $caja->nombre,
            'estado' => $caja->movimientoActual ? 'ABIERTA' : 'CERRADA',
            'movimiento' => $caja->movimientoActual
        ];

        return response()->json($estado);
    }

    // 7. Aperturar caja
    public function aperturar(Request $request, $id)
    {
        $request->validate([
            'monto_inicial' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string'
        ]);

        $caja = Caja::findOrFail($id);

        // Validar que no esté abierta
        $abierta = CajaMovimiento::where('caja_id', $id)
            ->where('estado', 'ABIERTA')
            ->exists();

        if ($abierta) {
            return response()->json(['error' => 'La caja ya está abierta'], 400);
        }

        $movimiento = CajaMovimiento::create([
            'caja_id' => $id,
            'user_id' => auth()->id(),
            'fecha' => now()->toDateString(),
            'hora' => now()->toTimeString(),
            'monto_inicial' => $request->monto_inicial,
            'observaciones' => $request->observaciones,
            'estado' => 'ABIERTA'
        ]);

        return response()->json($movimiento->load(['caja', 'user']), 201);
    }

    // 8. Cerrar caja
    public function cerrar(Request $request, $id)
    {
        $request->validate([
            'monto_final' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string'
        ]);

        $movimiento = CajaMovimiento::where('caja_id', $id)
            ->where('estado', 'ABIERTA')
            ->firstOrFail();

        // Calcular monto del sistema
        $ingresos = $movimiento->transacciones()->where('tipo', 'INGRESO')->sum('monto');
        $egresos = $movimiento->transacciones()->where('tipo', 'EGRESO')->sum('monto');
        $montoSistema = $movimiento->monto_inicial + $ingresos - $egresos;

        $movimiento->update([
            'monto_final' => $request->monto_final,
            'monto_sistema' => $montoSistema,
            'diferencia' => $request->monto_final - $montoSistema,
            'observaciones' => $request->observaciones,
            'estado' => 'CERRADA'
        ]);

        return response()->json($movimiento->load(['caja', 'user']));
    }

    // 9. Registrar transacción
    public function storeTransaccion(Request $request, $id)
    {
        $request->validate([
            'tipo' => 'required|in:INGRESO,EGRESO',
            'categoria' => 'required|in:VENTA,COBRO,GASTO,RETIRO,OTRO',
            'monto' => 'required|numeric|min:0',
            'metodo_pago' => 'required|string',
            'referencia' => 'nullable|string',
            'venta_id' => 'nullable|exists:ventas,id',
            'comprobante_id' => 'nullable|exists:comprobantes,id',
            'descripcion' => 'nullable|string'
        ]);

        // Obtener movimiento activo
        $movimiento = CajaMovimiento::where('caja_id', $id)
            ->where('estado', 'ABIERTA')
            ->firstOrFail();

        $transaccion = CajaTransaccion::create([
            'caja_movimiento_id' => $movimiento->id,
            'tipo' => $request->tipo,
            'categoria' => $request->categoria,
            'monto' => $request->monto,
            'metodo_pago' => $request->metodo_pago,
            'referencia' => $request->referencia,
            'venta_id' => $request->venta_id,
            'comprobante_id' => $request->comprobante_id,
            'descripcion' => $request->descripcion,
            'user_id' => auth()->id()
        ]);

        return response()->json($transaccion->load('user'), 201);
    }

    // 10. Historial de transacciones
    public function getTransacciones($id)
    {
        $movimiento = CajaMovimiento::where('caja_id', $id)
            ->where('estado', 'ABIERTA')
            ->with(['transacciones.user', 'transacciones.venta', 'transacciones.comprobante'])
            ->firstOrFail();

        $ingresos = $movimiento->transacciones()->where('tipo', 'INGRESO')->sum('monto');
        $egresos = $movimiento->transacciones()->where('tipo', 'EGRESO')->sum('monto');

        return response()->json([
            'movimiento' => $movimiento,
            'transacciones' => $movimiento->transacciones,
            'resumen' => [
                'monto_inicial' => $movimiento->monto_inicial,
                'total_ingresos' => $ingresos,
                'total_egresos' => $egresos,
                'saldo_actual' => $movimiento->monto_inicial + $ingresos - $egresos
            ]
        ]);
    }

    // 11. Anular transacción
    public function deleteTransaccion($id, $txId)
    {
        $movimiento = CajaMovimiento::where('caja_id', $id)
            ->where('estado', 'ABIERTA')
            ->firstOrFail();

        $transaccion = CajaTransaccion::where('id', $txId)
            ->where('caja_movimiento_id', $movimiento->id)
            ->firstOrFail();

        // Soft delete o eliminación directa
        $transaccion->delete();

        return response()->json(['message' => 'Transacción anulada correctamente']);
    }

    // 12. Reporte del día
    public function reporte($id)
    {
        $movimiento = CajaMovimiento::where('caja_id', $id)
            ->with(['caja', 'user', 'transacciones.user'])
            ->latest()
            ->firstOrFail();

        $ingresos = $movimiento->transacciones()->where('tipo', 'INGRESO')->sum('monto');
        $egresos = $movimiento->transacciones()->where('tipo', 'EGRESO')->sum('monto');

        // Desglose por método de pago
        $porMetodo = $movimiento->transacciones()
            ->select('metodo_pago', DB::raw('SUM(monto) as total'))
            ->groupBy('metodo_pago')
            ->get();

        return response()->json([
            'movimiento' => $movimiento,
            'resumen' => [
                'monto_inicial' => $movimiento->monto_inicial,
                'total_ingresos' => $ingresos,
                'total_egresos' => $egresos,
                'monto_sistema' => $movimiento->monto_inicial + $ingresos - $egresos,
                'monto_final' => $movimiento->monto_final,
                'diferencia' => $movimiento->diferencia
            ],
            'por_metodo_pago' => $porMetodo
        ]);
    }
}
