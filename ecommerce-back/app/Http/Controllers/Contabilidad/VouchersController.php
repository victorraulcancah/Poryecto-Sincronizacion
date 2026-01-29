<?php

namespace App\Http\Controllers\Contabilidad;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VouchersController extends Controller
{
    /**
     * Listar vouchers
     */
    public function index(Request $request)
    {
        $query = Voucher::with(['user', 'verificador', 'cuentaPorCobrar', 'cuentaPorPagar']);

        if ($request->tipo) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->fecha_inicio) {
            $query->where('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha', '<=', $request->fecha_fin);
        }

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('numero_operacion', 'like', "%{$request->search}%")
                  ->orWhere('banco', 'like', "%{$request->search}%");
            });
        }

        $vouchers = $query->orderBy('fecha', 'desc')->paginate(20);

        return response()->json($vouchers);
    }

    /**
     * Registrar voucher con archivo
     */
    public function store(Request $request)
    {
        $request->validate([
            'tipo' => 'required|in:PAGO_CLIENTE,PAGO_PROVEEDOR,DEPOSITO,TRANSFERENCIA,OTRO',
            'numero_operacion' => 'required|string|max:100',
            'fecha' => 'required|date',
            'monto' => 'required|numeric|min:0',
            'metodo_pago' => 'required|string',
            'archivo_voucher' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // 5MB
            'banco' => 'nullable|string',
            'cuenta_origen' => 'nullable|string',
            'cuenta_destino' => 'nullable|string'
        ]);

        $data = $request->except('archivo_voucher');
        $data['user_id'] = auth()->id();

        // Subir archivo si existe
        if ($request->hasFile('archivo_voucher')) {
            $file = $request->file('archivo_voucher');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('vouchers', $filename, 'public');
            $data['archivo_voucher'] = $path;
        }

        $voucher = Voucher::create($data);

        return response()->json($voucher, 201);
    }

    /**
     * Ver voucher
     */
    public function show($id)
    {
        $voucher = Voucher::with(['user', 'verificador', 'cuentaPorCobrar', 'cuentaPorPagar', 'venta', 'compra'])
            ->findOrFail($id);

        return response()->json($voucher);
    }

    /**
     * Actualizar voucher
     */
    public function update(Request $request, $id)
    {
        $voucher = Voucher::findOrFail($id);

        $request->validate([
            'numero_operacion' => 'string|max:100',
            'fecha' => 'date',
            'monto' => 'numeric|min:0',
            'archivo_voucher' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120'
        ]);

        $data = $request->except('archivo_voucher');

        // Actualizar archivo si se envía uno nuevo
        if ($request->hasFile('archivo_voucher')) {
            // Eliminar archivo anterior
            if ($voucher->archivo_voucher) {
                Storage::disk('public')->delete($voucher->archivo_voucher);
            }

            $file = $request->file('archivo_voucher');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('vouchers', $filename, 'public');
            $data['archivo_voucher'] = $path;
        }

        $voucher->update($data);

        return response()->json($voucher);
    }

    /**
     * Verificar voucher
     */
    public function verificar(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|in:VERIFICADO,RECHAZADO',
            'observaciones' => 'nullable|string'
        ]);

        $voucher = Voucher::findOrFail($id);

        $voucher->update([
            'estado' => $request->estado,
            'observaciones' => $request->observaciones,
            'verificado_por' => auth()->id(),
            'verificado_at' => now()
        ]);

        return response()->json($voucher);
    }

    /**
     * Descargar archivo del voucher
     */
    public function descargarArchivo($id)
    {
        $voucher = Voucher::findOrFail($id);

        if (!$voucher->archivo_voucher) {
            return response()->json(['error' => 'No hay archivo adjunto'], 404);
        }

        $path = storage_path('app/public/' . $voucher->archivo_voucher);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Archivo no encontrado'], 404);
        }

        return response()->download($path);
    }

    /**
     * Eliminar voucher
     */
    public function destroy($id)
    {
        $voucher = Voucher::findOrFail($id);

        // Eliminar archivo
        if ($voucher->archivo_voucher) {
            Storage::disk('public')->delete($voucher->archivo_voucher);
        }

        $voucher->delete();

        return response()->json(['message' => 'Voucher eliminado correctamente']);
    }

    /**
     * Vouchers pendientes de verificación
     * NOTA: Este endpoint es redundante. Usar index() con ?estado=PENDIENTE
     * Se mantiene por compatibilidad pero se recomienda usar el filtro en index()
     */
    public function pendientes()
    {
        $vouchers = Voucher::with(['user'])
            ->where('estado', 'PENDIENTE')
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($vouchers);
    }
}
