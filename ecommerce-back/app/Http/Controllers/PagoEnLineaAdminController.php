<?php

namespace App\Http\Controllers;

use App\Mail\CompraEnLineaMail;
use App\Mail\ComprobanteEmitidoMail;
use App\Models\PagoEnLinea;
use App\Models\TipoPrecio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Panel de "Compras en línea" para el personal.
 *
 * El negocio atiende estas compras a mano: las ve acá, factura en el ERP,
 * envía el comprobante y coordina el delivery por teléfono. Este controlador
 * lista, deja constancia del seguimiento y envía al cliente el PDF que el
 * personal sube; no genera comprobantes, no factura ni toca el stock.
 */
class PagoEnLineaAdminController extends Controller
{
    // Resuelve la lista de precio del cliente por moneda (para "Enviar a ERP").
    use \App\Http\Controllers\Concerns\ResuelvePreciosPorMoneda;

    /**
     * Listado con filtros y conteo por estado de seguimiento.
     */
    public function index(Request $request): JsonResponse
    {
        $estado = $request->input('estado', 'pagado');
        $porPagina = max(1, min((int) $request->input('per_page', 20), 100));

        $query = PagoEnLinea::with('userCliente');

        if ($estado !== 'todos') {
            $query->where('estado', $estado === 'rechazado' ? PagoEnLinea::ESTADO_RECHAZADO : PagoEnLinea::ESTADO_PAGADO);
        }

        if ($request->filled('estado_proceso')) {
            $query->where('estado_proceso', $request->estado_proceso);
        }

        if ($request->filled('search')) {
            $termino = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($termino) {
                $q->where('codigo', 'like', $termino)
                    ->orWhere('cliente_nombre', 'like', $termino)
                    ->orWhere('cliente_email', 'like', $termino)
                    ->orWhere('telefono_contacto', 'like', $termino)
                    ->orWhere('numero_documento', 'like', $termino);
            });
        }

        $pagina = $query->orderByDesc('id')->paginate($porPagina);

        $listaErpPorTipoPrecio = TipoPrecio::pluck('tipo_precio_7power_id', 'id');
        $pagos = collect($pagina->items())
            ->map(fn (PagoEnLinea $p) => $this->transformar($p, $listaErpPorTipoPrecio))
            ->values();

        // Cuántas hay en cada etapa (solo las pagadas; las rechazadas no se atienden).
        $conteos = PagoEnLinea::where('estado', PagoEnLinea::ESTADO_PAGADO)
            ->selectRaw('estado_proceso, count(*) as n')
            ->groupBy('estado_proceso')
            ->pluck('n', 'estado_proceso');

        $resumen = [];
        foreach (PagoEnLinea::ESTADOS_PROCESO as $clave) {
            $resumen[$clave] = (int) ($conteos[$clave] ?? 0);
        }

        return response()->json([
            'status' => 'success',
            'pagos' => $pagos,
            'pagination' => [
                'current_page' => $pagina->currentPage(),
                'last_page' => $pagina->lastPage(),
                'per_page' => $pagina->perPage(),
                'total' => $pagina->total(),
            ],
            'resumen' => $resumen,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $pago = PagoEnLinea::with('userCliente')->find($id);
        if (! $pago) {
            return response()->json(['status' => 'error', 'message' => 'Compra no encontrada.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'pago' => $this->transformar($pago, TipoPrecio::pluck('tipo_precio_7power_id', 'id')),
        ]);
    }

    /**
     * Deja constancia del avance manual: etapa, comprobante emitido en el ERP
     * y notas internas.
     */
    public function seguimiento(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'estado_proceso' => ['required', Rule::in(PagoEnLinea::ESTADOS_PROCESO)],
            'comprobante_erp' => 'nullable|string|max:50',
            'notas_internas' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de seguimiento incorrectos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $pago = PagoEnLinea::with('userCliente')->find($id);
        if (! $pago) {
            return response()->json(['status' => 'error', 'message' => 'Compra no encontrada.'], 404);
        }

        if ($pago->estado !== PagoEnLinea::ESTADO_PAGADO) {
            return response()->json([
                'status' => 'error',
                'message' => 'Solo se da seguimiento a compras pagadas.',
            ], 422);
        }

        $pago->forceFill([
            'estado_proceso' => $request->estado_proceso,
            'comprobante_erp' => $request->filled('comprobante_erp') ? trim($request->comprobante_erp) : null,
            'notas_internas' => $request->filled('notas_internas') ? trim($request->notas_internas) : null,
            'atendido_por' => $request->user()?->id,
            'atendido_at' => now(),
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Seguimiento actualizado.',
            'pago' => $this->transformar($pago->fresh('userCliente'), TipoPrecio::pluck('tipo_precio_7power_id', 'id')),
        ]);
    }

    /**
     * Vuelve a mandar al cliente el correo de confirmación de la compra.
     */
    public function reenviar(int $id): JsonResponse
    {
        $pago = PagoEnLinea::find($id);
        if (! $pago) {
            return response()->json(['status' => 'error', 'message' => 'Compra no encontrada.'], 404);
        }

        if ($pago->estado !== PagoEnLinea::ESTADO_PAGADO) {
            return response()->json([
                'status' => 'error',
                'message' => 'Solo se reenvía la confirmación de compras pagadas.',
            ], 422);
        }

        try {
            Mail::to($pago->cliente_email)->send(new CompraEnLineaMail($pago));
            $pago->forceFill(['email_enviado_at' => now()])->save();
        } catch (\Throwable $e) {
            Log::warning('Compra en línea: no se pudo reenviar la confirmación', [
                'codigo' => $pago->codigo,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'No se pudo enviar el correo. Intenta nuevamente en unos minutos.',
            ], 502);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Confirmación enviada a ' . $pago->cliente_email . '.',
        ]);
    }

    /**
     * Sube el PDF del comprobante (boleta o factura emitida en el ERP) y lo
     * envía al cliente por correo.
     */
    public function enviarComprobante(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'archivo' => 'required|file|mimes:pdf|max:5120',
            'mensaje' => 'nullable|string|max:500',
            'comprobante_erp' => 'nullable|string|max:50',
        ], [
            'archivo.required' => 'Elige el PDF del comprobante.',
            'archivo.mimes' => 'El comprobante debe ser un archivo PDF.',
            'archivo.max' => 'El PDF no puede pesar más de 5 MB.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $pago = PagoEnLinea::with('userCliente')->find($id);
        if (! $pago) {
            return response()->json(['status' => 'error', 'message' => 'Compra no encontrada.'], 404);
        }

        if ($pago->estado !== PagoEnLinea::ESTADO_PAGADO) {
            return response()->json([
                'status' => 'error',
                'message' => 'Solo se envía comprobante de compras pagadas.',
            ], 422);
        }

        // Archivo privado (no público): solo se entrega por el panel o por correo.
        $anterior = $pago->comprobante_archivo;
        $nombreOriginal = $request->file('archivo')->getClientOriginalName();
        $ruta = $request->file('archivo')->storeAs(
            'comprobantes-compras',
            $pago->codigo . '-' . now()->format('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.pdf',
            'local'
        );

        $pago->forceFill([
            'comprobante_archivo' => $ruta,
            'comprobante_nombre' => $nombreOriginal,
            'comprobante_enviado_at' => null,
            'comprobante_enviado_por' => null,
            'atendido_por' => $request->user()?->id,
            'atendido_at' => now(),
        ]);
        if ($request->filled('comprobante_erp')) {
            $pago->comprobante_erp = trim($request->comprobante_erp);
        }
        $pago->save();

        // Un comprobante nuevo reemplaza al anterior.
        if ($anterior && $anterior !== $ruta && Storage::disk('local')->exists($anterior)) {
            Storage::disk('local')->delete($anterior);
        }

        $enviado = $this->enviarCorreoComprobante($pago, $request->input('mensaje'));

        if (! $enviado) {
            return response()->json([
                'status' => 'error',
                'message' => 'El PDF quedó guardado, pero no se pudo enviar el correo. Puedes reintentar con "Reenviar".',
                'pago' => $this->transformar($pago->fresh('userCliente'), TipoPrecio::pluck('tipo_precio_7power_id', 'id')),
            ], 502);
        }

        $pago->forceFill([
            'comprobante_enviado_at' => now(),
            'comprobante_enviado_por' => $request->user()?->id,
        ]);
        // Al entregar el comprobante la compra ya está facturada.
        if ($pago->estado_proceso === 'pendiente_facturar') {
            $pago->estado_proceso = 'facturado';
        }
        $pago->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Comprobante enviado a ' . $pago->cliente_email . '.',
            'pago' => $this->transformar($pago->fresh('userCliente'), TipoPrecio::pluck('tipo_precio_7power_id', 'id')),
        ]);
    }

    /**
     * Abre o descarga el PDF que se subió (solo personal con acceso al panel).
     */
    public function verComprobante(int $id)
    {
        $pago = PagoEnLinea::find($id);
        if (! $pago || ! $pago->comprobante_archivo || ! Storage::disk('local')->exists($pago->comprobante_archivo)) {
            return response()->json(['status' => 'error', 'message' => 'Esta compra no tiene comprobante subido.'], 404);
        }

        return Storage::disk('local')->download(
            $pago->comprobante_archivo,
            $pago->comprobante_nombre ?: ('Comprobante-' . $pago->codigo . '.pdf'),
            ['Content-Type' => 'application/pdf']
        );
    }

    /**
     * Vuelve a enviar al cliente el PDF ya subido.
     */
    public function reenviarComprobante(Request $request, int $id): JsonResponse
    {
        $pago = PagoEnLinea::with('userCliente')->find($id);
        if (! $pago || ! $pago->comprobante_archivo || ! Storage::disk('local')->exists($pago->comprobante_archivo)) {
            return response()->json(['status' => 'error', 'message' => 'Esta compra no tiene comprobante subido.'], 404);
        }

        if (! $this->enviarCorreoComprobante($pago, null)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se pudo enviar el correo. Intenta nuevamente en unos minutos.',
            ], 502);
        }

        $pago->forceFill([
            'comprobante_enviado_at' => now(),
            'comprobante_enviado_por' => $request->user()?->id,
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Comprobante enviado a ' . $pago->cliente_email . '.',
            'pago' => $this->transformar($pago->fresh('userCliente'), TipoPrecio::pluck('tipo_precio_7power_id', 'id')),
        ]);
    }

    /** Envía el PDF guardado; devuelve false si el correo falló. */
    private function enviarCorreoComprobante(PagoEnLinea $pago, ?string $mensaje): bool
    {
        try {
            Mail::to($pago->cliente_email)->send(new ComprobanteEmitidoMail(
                $pago,
                $mensaje ? trim($mensaje) : null,
                Storage::disk('local')->path($pago->comprobante_archivo),
                $pago->comprobante_nombre ?: ('Comprobante-' . $pago->codigo . '.pdf')
            ));

            return true;
        } catch (\Throwable $e) {
            Log::warning('Compra en línea: no se pudo enviar el comprobante', [
                'codigo' => $pago->codigo,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function transformar(PagoEnLinea $pago, $listaErpPorTipoPrecio): array
    {
        $cliente = $pago->userCliente;

        // Id que tiene en el ERP la lista de precio con la que se cobró: sin
        // ella, "Nueva Venta" abre con la lista del cliente y los productos
        // cotizados en dólares quedan en 0.
        $listaErp = null;
        if ($cliente) {
            $porMoneda = collect($this->listasPrecioAplicables($cliente))->pluck('tipo_precio_id', 'moneda');
            $tipoPrecioId = $porMoneda[$pago->moneda] ?? null;
            $listaErp = $tipoPrecioId ? ($listaErpPorTipoPrecio[$tipoPrecioId] ?? null) : null;
        }

        return [
            'id' => $pago->id,
            'codigo' => $pago->codigo,
            'fecha' => $pago->created_at?->toIso8601String(),
            'estado' => $pago->estado,
            'estado_proceso' => $pago->estado_proceso,
            'simulado' => $pago->simulado,
            'moneda' => $pago->moneda,
            'subtotal' => $pago->subtotal,
            'igv' => $pago->igv,
            'descuento' => $pago->descuento,
            'cupon_codigo' => $pago->cupon_codigo,
            'costo_envio' => $pago->costo_envio,
            'total' => $pago->total,
            'referencia_pasarela' => $pago->referencia_pasarela,
            'mensaje_pasarela' => $pago->mensaje_pasarela,
            'tarjeta_marca' => $pago->tarjeta_marca,
            'tarjeta_ultimos4' => $pago->tarjeta_ultimos4,
            'cliente_nombre' => $pago->cliente_nombre,
            'cliente_email' => $pago->cliente_email,
            'numero_documento' => $pago->numero_documento,
            'telefono_contacto' => $pago->telefono_contacto,
            'direccion_envio' => $pago->direccion_envio,
            'departamento_nombre' => $pago->departamento_nombre,
            'provincia_nombre' => $pago->provincia_nombre,
            'distrito_nombre' => $pago->distrito_nombre,
            'observaciones' => $pago->observaciones,
            'comprobante_erp' => $pago->comprobante_erp,
            'notas_internas' => $pago->notas_internas,
            'atendido_at' => $pago->atendido_at?->toIso8601String(),
            'tiene_comprobante' => (bool) $pago->comprobante_archivo,
            'comprobante_nombre' => $pago->comprobante_nombre,
            'comprobante_enviado_at' => $pago->comprobante_enviado_at?->toIso8601String(),
            'email_enviado_at' => $pago->email_enviado_at?->toIso8601String(),
            'codigo_erp' => $cliente?->codigo_erp,
            'lista_precio_erp' => $listaErp,
            'items' => $pago->items,
        ];
    }
}
