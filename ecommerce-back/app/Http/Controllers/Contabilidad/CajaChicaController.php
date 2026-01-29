<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\CajaChica;
use App\Models\CajaChicaMovimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CajaChicaController extends Controller
{
    // 1. Listar
    public function index()
    {
        $cajas = CajaChica::with('responsable')->get();
        return response()->json($cajas);
    }

    // 2. Crear (código automático CCH-001)
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'fondo_fijo' => 'required|numeric|min:0',
            'responsable_id' => 'required|exists:users,id',
            'activo' => 'sometimes|boolean'
        ]);

        // Generar código automático
        $ultimo = CajaChica::orderBy('id', 'desc')->first();
        $numero = $ultimo ? ($ultimo->id + 1) : 1;
        $codigo = 'CCH-' . str_pad($numero, 3, '0', STR_PAD_LEFT);

        $caja = CajaChica::create([
            'nombre' => $request->nombre,
            'codigo' => $codigo,
            'fondo_fijo' => $request->fondo_fijo,
            'saldo_actual' => $request->fondo_fijo,
            'responsable_id' => $request->responsable_id,
            'activo' => $request->activo ?? true
        ]);

        return response()->json($caja->load('responsable'), 201);
    }

    // 3. Ver detalle
    public function show($id)
    {
        $caja = CajaChica::with(['responsable', 'movimientos'])->findOrFail($id);
        return response()->json($caja);
    }

    // 4. Saldo disponible
    public function saldo($id)
    {
        $caja = CajaChica::findOrFail($id);
        
        return response()->json([
            'caja_id' => $caja->id,
            'nombre' => $caja->nombre,
            'fondo_fijo' => $caja->fondo_fijo,
            'saldo_actual' => $caja->saldo_actual,
            'porcentaje_disponible' => ($caja->saldo_actual / $caja->fondo_fijo) * 100
        ]);
    }

    // 5. Registrar gasto
    public function storeGasto(Request $request, $id)
    {
        $request->validate([
            'fecha' => 'required|date',
            'monto' => 'required|numeric|min:0',
            'categoria' => 'required|in:VIATICOS,UTILES_OFICINA,SERVICIOS,MANTENIMIENTO,TRANSPORTE,OTROS',
            'descripcion' => 'required|string',
            'comprobante_tipo' => 'nullable|string',
            'comprobante_numero' => 'nullable|string',
            'proveedor' => 'nullable|string',
            'archivo_adjunto' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120'
        ]);

        $caja = CajaChica::findOrFail($id);

        // Validar saldo
        if ($request->monto > $caja->saldo_actual) {
            return response()->json(['error' => 'Saldo insuficiente'], 400);
        }

        DB::beginTransaction();
        try {
            $data = $request->except('archivo_adjunto');
            $data['caja_chica_id'] = $id;
            $data['tipo'] = 'GASTO';
            $data['user_id'] = auth()->id();

            // Subir archivo
            if ($request->hasFile('archivo_adjunto')) {
                $path = $request->file('archivo_adjunto')->store('caja-chica', 'public');
                $data['archivo_adjunto'] = $path;
            }

            $movimiento = CajaChicaMovimiento::create($data);

            // Descontar del saldo
            $caja->decrement('saldo_actual', $request->monto);

            DB::commit();
            return response()->json($movimiento->load('user'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 6. Listar gastos
    public function getGastos($id)
    {
        $gastos = CajaChicaMovimiento::where('caja_chica_id', $id)
            ->with(['user', 'aprobador'])
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($gastos);
    }

    // 7. Editar gasto (solo si está pendiente)
    public function updateGasto(Request $request, $gastoId)
    {
        $gasto = CajaChicaMovimiento::findOrFail($gastoId);

        if ($gasto->estado !== 'PENDIENTE') {
            return response()->json(['error' => 'Solo se pueden editar gastos pendientes'], 400);
        }

        $request->validate([
            'monto' => 'sometimes|numeric|min:0',
            'categoria' => 'sometimes|in:VIATICOS,UTILES_OFICINA,SERVICIOS,MANTENIMIENTO,TRANSPORTE,OTROS',
            'descripcion' => 'sometimes|string'
        ]);

        // Si cambia el monto, ajustar saldo
        if ($request->has('monto') && $request->monto != $gasto->monto) {
            $diferencia = $request->monto - $gasto->monto;
            $caja = $gasto->cajaChica;
            
            if ($diferencia > $caja->saldo_actual) {
                return response()->json(['error' => 'Saldo insuficiente'], 400);
            }

            $caja->decrement('saldo_actual', $diferencia);
        }

        $gasto->update($request->only(['monto', 'categoria', 'descripcion', 'comprobante_tipo', 'comprobante_numero', 'proveedor']));

        return response()->json($gasto);
    }

    // 8. Aprobar/Rechazar gasto
    public function aprobarGasto(Request $request, $gastoId)
    {
        $request->validate([
            'estado' => 'required|in:APROBADO,RECHAZADO',
            'observaciones' => 'nullable|string'
        ]);

        $gasto = CajaChicaMovimiento::findOrFail($gastoId);

        if ($gasto->estado !== 'PENDIENTE') {
            return response()->json(['error' => 'El gasto ya fue procesado'], 400);
        }

        DB::beginTransaction();
        try {
            // Si se rechaza, devolver el monto al saldo
            if ($request->estado === 'RECHAZADO') {
                $gasto->cajaChica->increment('saldo_actual', $gasto->monto);
            }

            $gasto->update([
                'estado' => $request->estado,
                'aprobado_por' => auth()->id(),
                'aprobado_at' => now()
            ]);

            DB::commit();
            return response()->json($gasto->load(['user', 'aprobador']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 9. Gastos pendientes
    public function gastosPendientes()
    {
        $gastos = CajaChicaMovimiento::where('estado', 'PENDIENTE')
            ->with(['cajaChica', 'user'])
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($gastos);
    }

    // 10. Reposición
    public function reposicion(Request $request, $id)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0'
        ]);

        $caja = CajaChica::findOrFail($id);

        DB::beginTransaction();
        try {
            CajaChicaMovimiento::create([
                'caja_chica_id' => $id,
                'tipo' => 'REPOSICION',
                'fecha' => now()->toDateString(),
                'monto' => $request->monto,
                'categoria' => 'OTROS',
                'descripcion' => 'Reposición de fondo',
                'estado' => 'APROBADO',
                'user_id' => auth()->id(),
                'aprobado_por' => auth()->id(),
                'aprobado_at' => now()
            ]);

            $caja->increment('saldo_actual', $request->monto);

            DB::commit();
            return response()->json(['message' => 'Reposición registrada', 'saldo_actual' => $caja->fresh()->saldo_actual]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 11. Rendición
    public function rendicion(Request $request, $id)
    {
        $caja = CajaChica::with('responsable')->findOrFail($id);

        $query = CajaChicaMovimiento::where('caja_chica_id', $id);

        if ($request->fecha_inicio) {
            $query->where('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha', '<=', $request->fecha_fin);
        }

        $movimientos = $query->with(['user', 'aprobador'])->orderBy('fecha')->get();

        $gastos = $movimientos->where('tipo', 'GASTO')->sum('monto');
        $reposiciones = $movimientos->where('tipo', 'REPOSICION')->sum('monto');

        return response()->json([
            'caja' => $caja,
            'movimientos' => $movimientos,
            'resumen' => [
                'fondo_fijo' => $caja->fondo_fijo,
                'total_gastos' => $gastos,
                'total_reposiciones' => $reposiciones,
                'saldo_actual' => $caja->saldo_actual
            ]
        ]);
    }
}
