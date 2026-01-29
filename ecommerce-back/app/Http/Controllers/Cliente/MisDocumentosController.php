<?php

namespace App\Http\Controllers\Cliente;

use App\Http\Controllers\Controller;
use App\Models\Comprobante;
use App\Models\CuentaPorCobrar;
use App\Models\Venta;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class MisDocumentosController extends Controller
{
    /**
     * Listar mis comprobantes
     */
    public function misComprobantes(Request $request)
    {
        $user = auth()->user();

        // Obtener comprobantes del cliente
        $query = Comprobante::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhere('cliente_email', $user->email);
        });

        if ($request->tipo_comprobante) {
            $query->where('tipo_comprobante', $request->tipo_comprobante);
        }

        if ($request->fecha_inicio) {
            $query->where('fecha_emision', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha_emision', '<=', $request->fecha_fin);
        }

        $comprobantes = $query->orderBy('fecha_emision', 'desc')->paginate(20);

        return response()->json($comprobantes);
    }

    /**
     * Ver detalle de comprobante
     */
    public function verComprobante($id)
    {
        $user = auth()->user();

        $comprobante = Comprobante::with('detalles')
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('cliente_email', $user->email);
            })
            ->findOrFail($id);

        return response()->json($comprobante);
    }

    /**
     * Descargar comprobante en PDF
     */
    public function descargarComprobantePDF($id)
    {
        $user = auth()->user();

        $comprobante = Comprobante::with('detalles')
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('cliente_email', $user->email);
            })
            ->findOrFail($id);

        // Si ya tiene PDF guardado
        if ($comprobante->pdf_base64) {
            $pdf = base64_decode($comprobante->pdf_base64);

            return response($pdf, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="'.$comprobante->serie.'-'.$comprobante->correlativo.'.pdf"');
        }

        // Generar PDF
        $data = [
            'comprobante' => $comprobante,
        ];

        $pdf = PDF::loadView('exports.comprobante-cliente-pdf', $data);

        return $pdf->download($comprobante->serie.'-'.$comprobante->correlativo.'.pdf');
    }

    /**
     * Descargar XML del comprobante
     */
    public function descargarComprobanteXML($id)
    {
        $user = auth()->user();

        $comprobante = Comprobante::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhere('cliente_email', $user->email);
        })
            ->findOrFail($id);

        if (! $comprobante->xml_firmado) {
            return response()->json(['error' => 'XML no disponible'], 404);
        }

        $xml = base64_decode($comprobante->xml_firmado);

        return response($xml, 200)
            ->header('Content-Type', 'application/xml')
            ->header('Content-Disposition', 'attachment; filename="'.$comprobante->serie.'-'.$comprobante->correlativo.'.xml"');
    }

    /**
     * Mis ventas
     */
    public function misVentas(Request $request)
    {
        $user = auth()->user();

        $query = Venta::with(['detalles.producto', 'comprobante'])
            ->where('user_id', $user->id);

        if ($request->fecha_inicio) {
            $query->where('created_at', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('created_at', '<=', $request->fecha_fin);
        }

        $ventas = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($ventas);
    }

    /**
     * Mis cuentas por cobrar (si soy cliente con crédito)
     */
    public function misCuentasPorCobrar()
    {
        $user = auth()->user();

        // Buscar cliente asociado al usuario
        $cliente = $user->cliente;

        if (! $cliente) {
            return response()->json(['error' => 'No tienes cuentas por cobrar'], 404);
        }

        $cuentas = CuentaPorCobrar::with(['pagos', 'comprobante'])
            ->where('cliente_id', $cliente->id)
            ->whereIn('estado', ['PENDIENTE', 'PARCIAL'])
            ->orderBy('fecha_vencimiento')
            ->get();

        return response()->json([
            'cuentas' => $cuentas,
            'total_pendiente' => $cuentas->sum('saldo_pendiente'),
        ]);
    }

    /**
     * Descargar estado de cuenta
     */
    public function descargarEstadoCuenta()
    {
        $user = auth()->user();
        $cliente = $user->cliente;

        if (! $cliente) {
            return response()->json(['error' => 'No tienes estado de cuenta'], 404);
        }

        $cuentas = CuentaPorCobrar::with(['pagos', 'comprobante'])
            ->where('cliente_id', $cliente->id)
            ->orderBy('fecha_emision')
            ->get();

        $data = [
            'cliente' => $cliente,
            'cuentas' => $cuentas,
            'total_pendiente' => $cuentas->whereIn('estado', ['PENDIENTE', 'PARCIAL'])->sum('saldo_pendiente'),
        ];

        $pdf = PDF::loadView('exports.estado-cuenta-pdf', $data);

        return $pdf->download('estado-cuenta-'.$cliente->numero_documento.'.pdf');
    }

    /**
     * Enviar comprobante por email
     */
    public function reenviarComprobante($id)
    {
        $user = auth()->user();

        $comprobante = Comprobante::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhere('cliente_email', $user->email);
        })
            ->findOrFail($id);

        // Usar el servicio de notificaciones
        $notificacionService = app(\App\Services\NotificacionService::class);

        $cliente = (object) [
            'email' => $user->email,
            'nombre_completo' => $user->name,
        ];

        $notificacionService->notificarComprobanteGenerado($comprobante, $cliente);

        return response()->json(['message' => 'Comprobante enviado a tu email']);
    }
}
