<?php

namespace App\Http\Controllers;

use App\Mail\CompraEnLineaMail;
use App\Models\CartItem;
use App\Models\Cupon;
use App\Models\EmpresaInfo;
use App\Models\PagoEnLinea;
use App\Models\UserCliente;
use App\Services\Pasarela\PasarelaSimulada;
use App\Support\StockEnVivo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * Compra por pasarela de pago (botón "Pagar" del carrito).
 *
 * Es independiente del flujo de pedidos y cotizaciones: no crea ni toca filas
 * de `pedidos`. Cobra lo que hay en el carrito del cliente, con el precio que
 * le corresponde según sus listas, y registra la compra en `pagos_en_linea`.
 *
 * La pasarela hoy es `PasarelaSimulada` (sin cobro real). Para pasar a Culqi se
 * cambia la llamada a `cobrar()` por el cargo real; el resto del método queda
 * igual.
 */
class PagoEnLineaController extends Controller
{
    // Mismo precio que ve el cliente en el catálogo y en el carrito.
    use \App\Http\Controllers\Concerns\ResuelvePreciosPorMoneda;

    /**
     * Datos que necesita la pantalla de pago antes de cobrar. Público: la
     * pantalla lo consulta antes de que el cliente haya iniciado sesión.
     */
    public function configuracion(): JsonResponse
    {
        return response()->json([
            'modo_prueba' => (bool) config('pasarela.modo_prueba'),
        ]);
    }

    /**
     * Cobra el carrito del cliente y registra la compra.
     */
    public function pagar(Request $request): JsonResponse
    {
        $cliente = $request->user();
        if (! $cliente instanceof UserCliente) {
            return response()->json(['message' => 'Debes iniciar sesión para pagar.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'cliente_nombre' => 'required|string|max:150',
            'cliente_email' => 'required|email|max:150',
            'numero_documento' => 'nullable|string|max:20',
            'telefono_contacto' => 'required|string|max:20',
            'direccion_envio' => 'required|string|max:500',
            'departamento_nombre' => 'required|string|max:100',
            'provincia_nombre' => 'required|string|max:100',
            'distrito_nombre' => 'required|string|max:100',
            'observaciones' => 'nullable|string|max:500',
            // Solo hace falta cuando el carrito mezcla soles y dólares.
            'moneda' => 'nullable|in:s,d',
            // Cupón aplicado en el carrito; se vuelve a validar acá.
            'cupon_codigo' => 'nullable|string|max:50',
            // Token de la tarjeta: nunca llega el número completo.
            'token' => 'required|string|max:100',
            'tarjeta_marca' => 'nullable|string|max:20',
            'tarjeta_ultimos4' => 'required|digits:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Revisa los datos de la compra.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $items = CartItem::with('producto.precios')
            ->where('user_cliente_id', $cliente->id)
            ->where(function ($q) {
                $q->where('guardado_para_despues', false)->orWhereNull('guardado_para_despues');
            })
            ->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Tu carrito está vacío.'], 422);
        }

        // Precio y moneda de cada línea, resueltos en el servidor: lo que el
        // navegador mande no cuenta.
        $listas = $this->listasPrecioAplicables($cliente);
        $lineas = [];
        $problemas = [];

        foreach ($items as $item) {
            $producto = $item->producto;

            if (! $producto || ! $producto->activo) {
                $problemas[] = 'Un producto de tu carrito ya no está disponible.';
                continue;
            }

            $pm = $this->precioYMonedaProducto($producto, $listas);
            if (($pm['precio'] ?? 0) <= 0 || empty($pm['moneda'])) {
                $problemas[] = "«{$producto->nombre}» no tiene precio publicado.";
                continue;
            }

            $lineas[] = [
                'item' => $item,
                'producto' => $producto,
                'cantidad' => (int) $item->cantidad,
                'precio' => (float) $pm['precio'],
                'moneda' => $pm['moneda'],
            ];
        }

        if (! empty($problemas)) {
            return response()->json([
                'message' => implode(' ', array_unique($problemas)),
            ], 422);
        }

        // Una pasarela cobra en una sola moneda.
        $monedas = array_values(array_unique(array_column($lineas, 'moneda')));
        if (count($monedas) > 1) {
            if (! in_array($request->moneda, $monedas, true)) {
                return response()->json([
                    'message' => 'Tu carrito tiene productos en soles y en dólares. Elige en qué moneda pagar ahora.',
                    'monedas_disponibles' => $monedas,
                ], 422);
            }
            $moneda = $request->moneda;
            $lineas = array_values(array_filter($lineas, fn ($l) => $l['moneda'] === $moneda));
        } else {
            $moneda = $monedas[0];
        }

        // Stock contra Novik en el momento, con la copia local de respaldo.
        $stockReal = StockEnVivo::de(array_map(fn ($l) => $l['producto']->id, $lineas));
        $sinStock = [];
        foreach ($lineas as $l) {
            $disponible = $stockReal[$l['producto']->id] ?? $l['producto']->stock;
            if ($disponible < $l['cantidad']) {
                $sinStock[] = $l['producto']->nombre;
            }
        }
        if (! empty($sinStock)) {
            return response()->json([
                'message' => 'No hay stock suficiente de: ' . implode(', ', $sinStock) . '.',
                'sin_stock' => $sinStock,
            ], 422);
        }

        $detalle = array_map(function ($l) {
            $p = $l['producto'];
            return [
                'producto_id' => $p->id,
                'codigo_producto' => $p->codigo_producto,
                'nombre' => $p->nombre,
                'cantidad' => $l['cantidad'],
                'precio_unitario' => round($l['precio'], 2),
                'subtotal' => round($l['precio'] * $l['cantidad'], 2),
                'imagen_url' => $p->imagen ? asset('storage/productos/' . $p->imagen) : null,
            ];
        }, $lineas);

        $subtotal = round(array_sum(array_column($detalle, 'subtotal')), 2);

        // Cupón: igual que en el carrito, solo aplica a soles. Si dejó de ser
        // válido se avisa en vez de cobrar un monto distinto al que vio el cliente.
        $descuento = 0.0;
        $cuponCodigo = null;
        if ($request->filled('cupon_codigo') && $moneda === 's') {
            $cupon = Cupon::where('codigo', $request->cupon_codigo)->disponibles()->first();
            if (! $cupon || ! $cupon->puedeUsarse($subtotal)) {
                return response()->json([
                    'message' => 'El cupón ya no es válido. Quítalo del carrito para continuar.',
                ], 422);
            }
            $descuento = round(min($subtotal, (float) $cupon->calcularDescuento($subtotal)), 2);
            $cuponCodigo = $cupon->codigo;
        }

        $total = round($subtotal - $descuento, 2);

        // El precio ya incluye IGV: solo se informa cuánto es cuando se compra
        // un único producto marcado con `mostrar_igv`, igual que el carrito.
        $igv = 0.0;
        if (count($lineas) === 1 && $lineas[0]['producto']->mostrar_igv) {
            $igv = round($total - ($total / 1.18), 2);
        }

        $pasarela = new PasarelaSimulada();
        $idsCobrados = array_map(fn ($l) => $l['item']->id, $lineas);

        $pago = DB::transaction(function () use ($request, $cliente, $pasarela, $moneda, $detalle, $subtotal, $igv, $cuponCodigo, $descuento, $total, $idsCobrados, &$resultado) {
            // Cobro: con Culqi este es el cargo real.
            $resultado = $pasarela->cobrar($request->token, $total, $moneda);

            $pago = PagoEnLinea::create([
                'codigo' => PagoEnLinea::generarCodigo(),
                'user_cliente_id' => $cliente->id,
                'estado' => $resultado['aprobado'] ? PagoEnLinea::ESTADO_PAGADO : PagoEnLinea::ESTADO_RECHAZADO,
                // Seguimiento manual: toda compra pagada entra a la bandeja por facturar.
                'estado_proceso' => 'pendiente_facturar',
                'simulado' => true,
                'pasarela' => 'simulada',
                'referencia_pasarela' => $resultado['referencia'],
                'mensaje_pasarela' => $resultado['mensaje'],
                'moneda' => $moneda,
                'subtotal' => $subtotal,
                'igv' => $igv,
                'cupon_codigo' => $cuponCodigo,
                'descuento' => $descuento,
                // El costo de envío se coordina con el cliente, igual que en
                // el checkout de pedidos.
                'costo_envio' => 0,
                'total' => $total,
                'items' => $detalle,
                'forma_envio' => 'delivery',
                'cliente_nombre' => $request->cliente_nombre,
                'cliente_email' => $request->cliente_email,
                'numero_documento' => $request->numero_documento,
                'telefono_contacto' => $request->telefono_contacto,
                'direccion_envio' => $request->direccion_envio,
                'departamento_nombre' => $request->departamento_nombre,
                'provincia_nombre' => $request->provincia_nombre,
                'distrito_nombre' => $request->distrito_nombre,
                'observaciones' => $request->observaciones,
                'tarjeta_marca' => $request->tarjeta_marca,
                'tarjeta_ultimos4' => $request->tarjeta_ultimos4,
            ]);

            // Compra aprobada: lo pagado sale del carrito. Lo de otra moneda y
            // lo "guardado para después" se queda. El stock no se descuenta
            // mientras la pasarela sea de prueba.
            if ($resultado['aprobado']) {
                CartItem::whereIn('id', $idsCobrados)->delete();
            }

            return $pago;
        });

        if ($pago->estado === PagoEnLinea::ESTADO_PAGADO) {
            $this->enviarCorreos($pago);
        }

        return response()->json([
            'status' => 'success',
            'aprobado' => $pago->estado === PagoEnLinea::ESTADO_PAGADO,
            'mensaje' => $resultado['mensaje'],
            'pago' => $this->transformar($pago),
        ]);
    }

    /**
     * Compras pagadas del cliente con su seguimiento (lo que marca el personal:
     * pendiente de facturar, facturado, en delivery, entregado o cancelado).
     * Los pagos rechazados no son compras: no se listan.
     */
    public function index(Request $request): JsonResponse
    {
        $cliente = $request->user();
        if (! $cliente instanceof UserCliente) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $pagos = PagoEnLinea::where('user_cliente_id', $cliente->id)
            ->where('estado', PagoEnLinea::ESTADO_PAGADO)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'status' => 'success',
            'pagos' => $pagos->map(fn (PagoEnLinea $pago) => $this->transformar($pago))->values(),
        ]);
    }

    /**
     * Una compra del cliente, para volver a ver su confirmación.
     */
    public function show(Request $request, string $codigo): JsonResponse
    {
        $cliente = $request->user();
        if (! $cliente instanceof UserCliente) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $pago = PagoEnLinea::where('codigo', $codigo)
            ->where('user_cliente_id', $cliente->id)
            ->first();

        if (! $pago) {
            return response()->json(['message' => 'Compra no encontrada.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'pago' => $this->transformar($pago),
        ]);
    }

    /**
     * Confirmación al cliente y aviso a la empresa. Va después de responder y
     * con cada envío aislado: un SMTP caído no puede deshacer ni demorar una
     * compra que ya quedó registrada.
     */
    private function enviarCorreos(PagoEnLinea $pago): void
    {
        $emailEmpresa = EmpresaInfo::first()?->email;

        dispatch(function () use ($pago, $emailEmpresa) {
            $enviado = false;

            try {
                Mail::to($pago->cliente_email)->send(new CompraEnLineaMail($pago));
                $enviado = true;
            } catch (\Throwable $e) {
                Log::warning('Pago en línea: no se pudo enviar la confirmación al cliente', [
                    'codigo' => $pago->codigo,
                    'error' => $e->getMessage(),
                ]);
            }

            if ($emailEmpresa && strcasecmp($emailEmpresa, $pago->cliente_email) !== 0) {
                try {
                    Mail::to($emailEmpresa)->send(new CompraEnLineaMail($pago, true));
                } catch (\Throwable $e) {
                    Log::warning('Pago en línea: no se pudo avisar a la empresa', [
                        'codigo' => $pago->codigo,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if ($enviado) {
                $pago->forceFill(['email_enviado_at' => now()])->save();
            }
        })->afterResponse();
    }

    private function transformar(PagoEnLinea $pago): array
    {
        return [
            'codigo' => $pago->codigo,
            'estado' => $pago->estado,
            // Seguimiento manual: nunca se expone `notas_internas`.
            'estado_proceso' => $pago->estado_proceso ?: 'pendiente_facturar',
            'comprobante_erp' => $pago->comprobante_erp,
            'comprobante_enviado_at' => $pago->comprobante_enviado_at?->toIso8601String(),
            'simulado' => $pago->simulado,
            'referencia_pasarela' => $pago->referencia_pasarela,
            'mensaje_pasarela' => $pago->mensaje_pasarela,
            'moneda' => $pago->moneda,
            'subtotal' => $pago->subtotal,
            'igv' => $pago->igv,
            'cupon_codigo' => $pago->cupon_codigo,
            'descuento' => $pago->descuento,
            'costo_envio' => $pago->costo_envio,
            'total' => $pago->total,
            'items' => $pago->items,
            'forma_envio' => $pago->forma_envio,
            'cliente_nombre' => $pago->cliente_nombre,
            'cliente_email' => $pago->cliente_email,
            'telefono_contacto' => $pago->telefono_contacto,
            'direccion_envio' => $pago->direccion_envio,
            'departamento_nombre' => $pago->departamento_nombre,
            'provincia_nombre' => $pago->provincia_nombre,
            'distrito_nombre' => $pago->distrito_nombre,
            'observaciones' => $pago->observaciones,
            'tarjeta_marca' => $pago->tarjeta_marca,
            'tarjeta_ultimos4' => $pago->tarjeta_ultimos4,
            'fecha' => $pago->created_at?->toIso8601String(),
        ];
    }
}
