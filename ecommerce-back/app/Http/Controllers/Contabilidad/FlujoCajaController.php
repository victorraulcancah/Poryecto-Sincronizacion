<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\FlujoCaja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FlujoCajaController extends Controller
{
    // 1. Listar proyecciones
    public function index(Request $request)
    {
        $query = FlujoCaja::with('user');

        if ($request->fecha_inicio) {
            $query->where('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha', '<=', $request->fecha_fin);
        }

        if ($request->tipo) {
            $query->where('tipo', $request->tipo);
        }

        $flujos = $query->orderBy('fecha')->get();

        return response()->json($flujos);
    }

    // 2. Crear proyección
    public function store(Request $request)
    {
        $request->validate([
            'fecha' => 'required|date',
            'tipo' => 'required|in:INGRESO,EGRESO',
            'categoria' => 'required|in:VENTAS,COBROS,PRESTAMOS,OTROS_INGRESOS,COMPRAS,PAGOS_PROVEEDORES,SUELDOS,SERVICIOS,IMPUESTOS,PRESTAMOS_PAGO,OTROS_EGRESOS',
            'concepto' => 'required|string|max:200',
            'monto_proyectado' => 'required|numeric',
            'recurrente' => 'sometimes|boolean',
            'frecuencia' => 'nullable|string',
            'observaciones' => 'nullable|string'
        ]);

        $flujo = FlujoCaja::create([
            ...$request->all(),
            'estado' => 'PROYECTADO',
            'user_id' => auth()->id()
        ]);

        return response()->json($flujo->load('user'), 201);
    }

    // 3. Ver detalle
    public function show($id)
    {
        $flujo = FlujoCaja::with('user')->findOrFail($id);
        return response()->json($flujo);
    }

    // 4. Actualizar
    public function update(Request $request, $id)
    {
        $flujo = FlujoCaja::findOrFail($id);

        $request->validate([
            'fecha' => 'sometimes|date',
            'tipo' => 'sometimes|in:INGRESO,EGRESO',
            'categoria' => 'sometimes|in:VENTAS,COBROS,PRESTAMOS,OTROS_INGRESOS,COMPRAS,PAGOS_PROVEEDORES,SUELDOS,SERVICIOS,IMPUESTOS,PRESTAMOS_PAGO,OTROS_EGRESOS',
            'concepto' => 'sometimes|string|max:200',
            'monto_proyectado' => 'sometimes|numeric',
            'recurrente' => 'sometimes|boolean',
            'frecuencia' => 'nullable|string',
            'observaciones' => 'nullable|string'
        ]);

        $flujo->update($request->all());

        return response()->json($flujo);
    }

    // 5. Eliminar
    public function destroy($id)
    {
        $flujo = FlujoCaja::findOrFail($id);
        $flujo->delete();

        return response()->json(['message' => 'Proyección eliminada correctamente']);
    }

    // 6. Registrar monto real
    public function registrarReal(Request $request, $id)
    {
        $request->validate([
            'monto_real' => 'required|numeric',
            'observaciones' => 'nullable|string'
        ]);

        $flujo = FlujoCaja::findOrFail($id);

        $flujo->update([
            'monto_real' => $request->monto_real,
            'estado' => 'REALIZADO',
            'observaciones' => $request->observaciones ?? $flujo->observaciones
        ]);

        return response()->json($flujo);
    }

    // 7. Comparativa proyectado vs real
    public function comparativa(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->endOfMonth()->toDateString();

        $flujos = FlujoCaja::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->where('estado', 'REALIZADO')
            ->get();

        $ingresos = [
            'proyectado' => $flujos->where('tipo', 'INGRESO')->sum('monto_proyectado'),
            'real' => $flujos->where('tipo', 'INGRESO')->sum('monto_real'),
        ];
        $ingresos['desviacion'] = $ingresos['real'] - $ingresos['proyectado'];

        $egresos = [
            'proyectado' => $flujos->where('tipo', 'EGRESO')->sum('monto_proyectado'),
            'real' => $flujos->where('tipo', 'EGRESO')->sum('monto_real'),
        ];
        $egresos['desviacion'] = $egresos['real'] - $egresos['proyectado'];

        $flujoNeto = [
            'proyectado' => $ingresos['proyectado'] - $egresos['proyectado'],
            'real' => $ingresos['real'] - $egresos['real'],
        ];
        $flujoNeto['desviacion'] = $flujoNeto['real'] - $flujoNeto['proyectado'];

        return response()->json([
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ],
            'ingresos' => $ingresos,
            'egresos' => $egresos,
            'flujo_neto' => $flujoNeto,
            'detalle' => $flujos
        ]);
    }

    // 8. Alertas (desviaciones > 10%)
    public function alertas(Request $request)
    {
        $fechaInicio = $request->fecha_inicio ?? now()->startOfMonth()->toDateString();
        $fechaFin = $request->fecha_fin ?? now()->endOfMonth()->toDateString();

        $flujos = FlujoCaja::whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->where('estado', 'REALIZADO')
            ->with('user')
            ->get();

        // Filtrar alertas con desviación > 10%
        $alertas = $flujos->filter(function($flujo) {
            $desviacion = abs($flujo->desviacion_porcentaje);
            return $desviacion !== null && $desviacion > 10;
        })->sortByDesc(function($flujo) {
            return abs($flujo->desviacion_porcentaje);
        })->values();

        $criticas = $alertas->filter(function($flujo) {
            return abs($flujo->desviacion_porcentaje) > 20;
        })->count();

        $moderadas = $alertas->filter(function($flujo) {
            $abs = abs($flujo->desviacion_porcentaje);
            return $abs >= 10 && $abs <= 20;
        })->count();

        return response()->json([
            'total_alertas' => $alertas->count(),
            'criticas' => $criticas,
            'moderadas' => $moderadas,
            'alertas' => $alertas
        ]);
    }
}
