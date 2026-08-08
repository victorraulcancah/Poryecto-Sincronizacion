<?php

namespace App\Http\Controllers;

use App\Models\Cotizacion;
use App\Models\CotizacionDetalle;
use App\Models\CotizacionTracking;
use App\Models\EstadoCotizacion;
use App\Models\UserCliente;
use App\Models\Producto;
use App\Models\TipoPrecio;
use App\Models\Compra;
use App\Models\Pedido;
use App\Models\PedidoDetalle;
use App\Models\EmpresaInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class CotizacionesController extends Controller
{
    // Precio y moneda por producto (soles y/o dolares).
    use \App\Http\Controllers\Concerns\ResuelvePreciosPorMoneda;

    private function isAdminUser($user): bool
    {
        return $user !== null
            && !($user instanceof UserCliente)
            && method_exists($user, 'hasRole')
            && $user->hasRole('admin');
    }

    /**
     * Obtener todas las cotizaciones (para admin)
     */
    public function index(Request $request)
    {
        try {
            $query = Cotizacion::with([
                'cliente',
                'userCliente',
                'estadoCotizacion',
                'detalles.producto',
                'tracking.estadoCotizacion'
            ]);

            // Filtros
            if ($request->has('estado_cotizacion_id') && $request->estado_cotizacion_id !== '') {
                $query->where('estado_cotizacion_id', $request->estado_cotizacion_id);
            }

            if ($request->has('user_cliente_id') && $request->user_cliente_id !== '') {
                $query->where('user_cliente_id', $request->user_cliente_id);
            }

            if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
                $query->whereBetween('fecha_cotizacion', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->has('search') && $request->search !== '') {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('codigo_cotizacion', 'LIKE', "%{$search}%")
                      ->orWhere('cliente_nombre', 'LIKE', "%{$search}%")
                      ->orWhere('cliente_email', 'LIKE', "%{$search}%")
                      ->orWhereHas('userCliente', function ($userQuery) use ($search) {
                          $userQuery->where('nombres', 'LIKE', "%{$search}%")
                                   ->orWhere('apellidos', 'LIKE', "%{$search}%")
                                   ->orWhere('email', 'LIKE', "%{$search}%");
                      });
                });
            }

            $cotizaciones = $query->orderBy('fecha_cotizacion', 'desc')->get();

            return response()->json([
                'status' => 'success',
                'cotizaciones' => $cotizaciones
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener cotizaciones',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar una cotización específica
     */
    public function show($id)
    {
        try {
            $cotizacion = Cotizacion::with([
                'cliente',
                'userCliente',
                'estadoCotizacion',
                'detalles.producto',
                'tracking.estadoCotizacion.usuario',
                'compras.estadoCompra',
                'metodosPago'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'cotizacion' => $cotizacion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cotización no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Crear cotización desde el checkout del e-commerce
     */
    public function crearCotizacionEcommerce(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|numeric|min:1',
            'metodo_pago_preferido' => 'nullable|string|max:50',
            'direccion_envio' => 'required|string',
            'telefono_contacto' => 'required|string|max:20',
            'observaciones' => 'nullable|string',
            'cliente_nombre' => 'required|string|max:255',
            'cliente_email' => 'required|email|max:255',
            'forma_envio' => 'required|string|max:50',
            'costo_envio' => 'nullable|numeric|min:0',
            'numero_documento' => 'nullable|string|max:20',
            'departamento_id' => 'nullable|string|max:2',
            'provincia_id' => 'nullable|string|max:4',
            'distrito_id' => 'nullable|string|max:6',
            'departamento_nombre' => 'nullable|string|max:255',
            'provincia_nombre' => 'nullable|string|max:255',
            'distrito_nombre' => 'nullable|string|max:255',
            'ubicacion_completa' => 'nullable|string',
            // Desglose completo de métodos de pago combinados (opcional, para
            // compatibilidad con clientes que aún envían solo "metodo_pago_preferido").
            'metodos_pago' => 'nullable|array|min:1',
            'metodos_pago.*.tipo' => 'required_with:metodos_pago|string|max:50',
            'metodos_pago.*.moneda' => 'required_with:metodos_pago|string|max:10',
            'metodos_pago.*.monto' => 'required_with:metodos_pago|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $userCliente = $request->user();

            if (!$userCliente instanceof UserCliente) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Acceso no autorizado'
                ], 403);
            }

            DB::beginTransaction();

            // Calcular totales
            $subtotal = 0;
            $igv = 0;
            $totalPorMoneda = [];
            $productosValidados = [];

            foreach ($request->productos as $prod) {
                $producto = Producto::findOrFail($prod['producto_id']);

                $cantidad = $prod['cantidad'];
                // El precio y la moneda se resuelven por producto: uno cotizado
                // solo en dolares se guardaba en 0 porque se buscaba unicamente
                // en la lista de soles.
                $pm = $this->precioYMonedaProducto($producto, $this->listasPrecioAplicables($userCliente));
                $precioUnitario = $pm['precio'];
                $subtotalLineaBruto = $cantidad * $precioUnitario;

                if ($producto->mostrar_igv) {
                    $subtotalLineaBase = $subtotalLineaBruto / 1.18;
                    $igvLinea = $subtotalLineaBruto - $subtotalLineaBase;
                } else {
                    $subtotalLineaBase = $subtotalLineaBruto;
                    $igvLinea = $subtotalLineaBruto * 0.18;
                }

                $subtotal += $subtotalLineaBase;
                $igv += $igvLinea;

                $monedaLinea = $pm['moneda'] ?? 's';
                // Total cobrable de cada moneda: es contra esto que se validan
                // los metodos de pago, porque soles y dolares no se suman.
                $totalPorMoneda[$monedaLinea] = ($totalPorMoneda[$monedaLinea] ?? 0) + $subtotalLineaBruto;

                $productosValidados[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal_linea' => $subtotalLineaBase,
                    'moneda' => $monedaLinea,
                ];
            }

            $costoEnvio = $request->costo_envio ?? 0;
            $total = $subtotal + $igv + $costoEnvio;
            // El envio se cobra en soles.
            $totalPorMoneda['s'] = ($totalPorMoneda['s'] ?? 0) + $costoEnvio;
            // Moneda de la cotizacion: la de sus lineas. Si se mezclan soles y
            // dolares se deja soles, porque la cabecera guarda un solo total;
            // cada linea si conserva su moneda real.
            $monedasUsadas = array_unique(array_column($productosValidados, 'moneda'));
            $moneda = count($monedasUsadas) === 1 ? reset($monedasUsadas) : 's';

            // Desglose de métodos de pago (si vino del checkout combinando
            // varios métodos, p.ej. Yape + Crédito). El crédito se descuenta
            // y registra aquí mismo, ya que el checkout solo genera cotizaciones.
            $metodosPago = $request->input('metodos_pago', []);
            $montoCredito = 0;

            if (!empty($metodosPago)) {
                // El cuadre se valida por moneda. Antes se comparaba la suma de
                // todos los metodos contra un unico total que mezclaba soles y
                // dolares, asi que una compra mixta nunca cuadraba.
                $pagadoPorMoneda = [];
                foreach ($metodosPago as $metodo) {
                    $m = $metodo['moneda'] ?? 's';
                    $pagadoPorMoneda[$m] = ($pagadoPorMoneda[$m] ?? 0) + (float) $metodo['monto'];
                }

                foreach (['s', 'd'] as $m) {
                    $esperado = round($totalPorMoneda[$m] ?? 0, 2);
                    $pagado = round($pagadoPorMoneda[$m] ?? 0, 2);

                    if (abs($esperado - $pagado) > 0.01) {
                        $simbolo = $m === 'd' ? 'US$' : 'S/';
                        throw new \Exception(
                            'Los métodos de pago en ' . ($m === 'd' ? 'dólares' : 'soles')
                            . ' suman ' . $simbolo . ' ' . number_format($pagado, 2)
                            . ' y el total es ' . $simbolo . ' ' . number_format($esperado, 2) . '.'
                        );
                    }
                }

                // Códigos que identifican un pago a crédito. 'credito_autorizado'
                // es el de la tabla tipo_pagos; los otros dos vienen de la card
                // que el checkout generaba por su cuenta y se siguen aceptando
                // para no romper cotizaciones ya enviadas.
                $codigosCredito = ['CREDITO_AUTORIZADO', 'CREDITO', 'CRÉDITO'];

                foreach ($metodosPago as $metodo) {
                    if (in_array(mb_strtoupper($metodo['tipo']), $codigosCredito, true)) {
                        $montoCredito += (float) $metodo['monto'];
                    }
                }

                if ($montoCredito > 0) {
                    // Bloquear la fila para evitar condiciones de carrera entre
                    // cotizaciones simultáneas del mismo cliente.
                    $clienteLock = UserCliente::where('id', $userCliente->id)->lockForUpdate()->first();
                    $disponible = $clienteLock->credito_disponible ?? 0;

                    if ($montoCredito > $disponible) {
                        throw new \Exception('El crédito disponible (S/ ' . number_format($disponible, 2) . ') es menor al monto solicitado a crédito.');
                    }

                    $clienteLock->decrement('credito_disponible', $montoCredito);
                }
            }

            // Una cotización por moneda. El cliente hace una sola compra, pero
            // soles y dólares se gestionan por separado: cada cotización lleva
            // su total en su propia moneda, con sus productos y sus métodos de
            // pago, y genera su propio pedido. Es lo que el ERP puede procesar,
            // porque una venta de 7Power maneja una sola moneda.
            $creadas = [];

            foreach (['s', 'd'] as $monedaCot) {
                $lineas = array_values(array_filter(
                    $productosValidados,
                    fn ($prod) => $prod['moneda'] === $monedaCot
                ));

                if (empty($lineas)) {
                    continue;
                }

                $pagosDeMoneda = array_values(array_filter(
                    $metodosPago,
                    fn ($metodo) => ($metodo['moneda'] ?? 's') === $monedaCot
                ));

                // El envío se cobra en soles, así que solo entra en esa cotización.
                $envioDeMoneda = $monedaCot === 's' ? $costoEnvio : 0;

                $subtotalCot = array_sum(array_column($lineas, 'subtotal_linea'));
                $totalCot = $totalPorMoneda[$monedaCot];
                $igvCot = $totalCot - $envioDeMoneda - $subtotalCot;

                $cotizacion = Cotizacion::create([
                    'codigo_cotizacion' => Cotizacion::generarCodigoCotizacion(),
                    'user_cliente_id' => $userCliente->id,
                    'fecha_cotizacion' => now(),
                    'subtotal' => $subtotalCot,
                    'igv' => $igvCot,
                    'descuento_total' => 0,
                    'total' => $totalCot,
                    'estado_cotizacion_id' => 1, // Pendiente
                    'metodo_pago_preferido' => $request->metodo_pago_preferido,
                    'direccion_envio' => $request->direccion_envio,
                    'telefono_contacto' => $request->telefono_contacto,
                    'observaciones' => $request->observaciones,
                    'numero_documento' => $request->numero_documento,
                    'cliente_nombre' => $request->cliente_nombre,
                    'cliente_email' => $request->cliente_email,
                    'forma_envio' => $request->forma_envio,
                    'costo_envio' => $envioDeMoneda,
                    'moneda' => $monedaCot,
                    'departamento_id' => $request->departamento_id,
                    'provincia_id' => $request->provincia_id,
                    'distrito_id' => $request->distrito_id,
                    'departamento_nombre' => $request->departamento_nombre,
                    'provincia_nombre' => $request->provincia_nombre,
                    'distrito_nombre' => $request->distrito_nombre,
                    'ubicacion_completa' => $request->ubicacion_completa,
                    'user_id' => 1 // Sistema
                ]);

                // Establecer fecha de vencimiento (7 días)
                $cotizacion->establecerFechaVencimiento(7);

                foreach ($pagosDeMoneda as $metodo) {
                    \App\Models\CotizacionMetodoPago::create([
                        'cotizacion_id' => $cotizacion->id,
                        'tipo' => $metodo['tipo'],
                        'moneda' => $metodo['moneda'],
                        'monto' => $metodo['monto'],
                    ]);
                }

                foreach ($lineas as $prod) {
                    CotizacionDetalle::create([
                        'cotizacion_id' => $cotizacion->id,
                        'producto_id' => $prod['producto']->id,
                        'codigo_producto' => $prod['producto']->codigo_producto,
                        'nombre_producto' => $prod['producto']->nombre,
                        'cantidad' => $prod['cantidad'],
                        'precio_unitario' => $prod['precio_unitario'],
                        'subtotal_linea' => $prod['subtotal_linea'],
                        'moneda' => $prod['moneda'],
                    ]);
                }

                CotizacionTracking::crearRegistro(
                    $cotizacion->id,
                    1, // Pendiente
                    'Cotización creada desde el checkout del e-commerce',
                    1 // Sistema
                );

                // El pedido se genera en el acto, en estado "En espera": el
                // cliente ya no tiene que pulsar "Pedir" en un segundo paso, y
                // mientras siga en ese estado puede editar la cotización.
                $pedido = $this->crearPedidoDesdeCotizacion($cotizacion);

                $creadas[] = [
                    'cotizacion' => $cotizacion->load(['detalles', 'estadoCotizacion', 'metodosPago']),
                    'codigo_cotizacion' => $cotizacion->codigo_cotizacion,
                    'pedido_codigo' => $pedido->codigo_pedido,
                    'moneda' => $monedaCot,
                    'total' => round($totalCot, 2),
                ];
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => count($creadas) > 1
                    ? 'Se generaron ' . count($creadas) . ' cotizaciones, una por moneda.'
                    : 'Cotización creada exitosamente',
                // Una entrada por moneda. Los campos sueltos apuntan a la
                // primera para no romper a quien lea la respuesta anterior.
                'cotizaciones' => $creadas,
                'cotizacion' => $creadas[0]['cotizacion'] ?? null,
                'codigo_cotizacion' => $creadas[0]['codigo_cotizacion'] ?? null,
                'pedido_codigo' => $creadas[0]['pedido_codigo'] ?? null,
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear cotización',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar cotización desde el e-commerce (solo el cliente dueño, solo en estado Pendiente)
     */
    public function actualizarCotizacionEcommerce(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|numeric|min:1',
            'metodo_pago_preferido' => 'nullable|string|max:50',
            'direccion_envio' => 'required|string',
            'telefono_contacto' => 'required|string|max:20',
            'observaciones' => 'nullable|string',
            'cliente_nombre' => 'required|string|max:255',
            'cliente_email' => 'required|email|max:255',
            'numero_documento' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $cotizacion = Cotizacion::findOrFail($id);
            $userCliente = $request->user();

            if (!$userCliente instanceof UserCliente) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Acceso no autorizado'
                ], 403);
            }

            if ($cotizacion->user_cliente_id !== $userCliente->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No tienes permisos para editar esta cotización'
                ], 403);
            }

            // El candado no es el estado de la cotización sino el del pedido:
            // el cliente puede editar mientras el vendedor no haya entrado a
            // atenderlo, o sea mientras el pedido siga "En espera".
            $pedido = $this->pedidoDeCotizacion($cotizacion);

            if ($pedido && !$pedido->esEditablePorCliente()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta cotización ya está siendo atendida y no se puede editar.'
                ], 422);
            }

            DB::beginTransaction();

            // Recalcular totales
            $subtotal = 0;
            $igv = 0;
            $productosValidados = [];

            foreach ($request->productos as $prod) {
                $producto = Producto::findOrFail($prod['producto_id']);
                $cantidad = $prod['cantidad'];
                $userCliente = UserCliente::find($cotizacion->user_cliente_id);
                // El precio y la moneda se resuelven por producto: uno cotizado
                // solo en dolares se guardaba en 0 porque se buscaba unicamente
                // en la lista de soles.
                $pm = $this->precioYMonedaProducto($producto, $this->listasPrecioAplicables($userCliente));
                $precioUnitario = $pm['precio'];
                $subtotalLineaBruto = $cantidad * $precioUnitario;

                if ($producto->mostrar_igv) {
                    $subtotalLineaBase = $subtotalLineaBruto / 1.18;
                    $igvLinea = $subtotalLineaBruto - $subtotalLineaBase;
                } else {
                    $subtotalLineaBase = $subtotalLineaBruto;
                    $igvLinea = $subtotalLineaBruto * 0.18;
                }

                $subtotal += $subtotalLineaBase;
                $igv += $igvLinea;

                $productosValidados[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal_linea' => $subtotalLineaBase,
                    'moneda' => $pm['moneda'] ?? 's',
                ];
            }

            $costoEnvio = $cotizacion->costo_envio ?? 0;
            $total = $subtotal + $igv + $costoEnvio;
            $monedasUsadas = array_unique(array_column($productosValidados, 'moneda'));
            $moneda = count($monedasUsadas) === 1 ? reset($monedasUsadas) : ($cotizacion->moneda ?? 's');

            $cotizacion->update([
                'subtotal' => $subtotal,
                'igv' => $igv,
                'total' => $total,
                'moneda' => $moneda,
                'metodo_pago_preferido' => $request->metodo_pago_preferido,
                'direccion_envio' => $request->direccion_envio,
                'telefono_contacto' => $request->telefono_contacto,
                'observaciones' => $request->observaciones,
                'numero_documento' => $request->numero_documento,
                'cliente_nombre' => $request->cliente_nombre,
                'cliente_email' => $request->cliente_email,
            ]);

            // Reemplazar detalles
            $cotizacion->detalles()->delete();
            foreach ($productosValidados as $prod) {
                CotizacionDetalle::create([
                    'cotizacion_id' => $cotizacion->id,
                    'producto_id' => $prod['producto']->id,
                    'codigo_producto' => $prod['producto']->codigo_producto,
                    'nombre_producto' => $prod['producto']->nombre,
                    'cantidad' => $prod['cantidad'],
                    'precio_unitario' => $prod['precio_unitario'],
                    'subtotal_linea' => $prod['subtotal_linea'],
                    // Moneda real de la linea, que puede diferir de la de la
                    // cabecera cuando el carrito mezcla soles y dolares.
                    'moneda' => $prod['moneda'],
                ]);
            }

            CotizacionTracking::crearRegistro(
                $cotizacion->id,
                1,
                'Cotización editada por el cliente',
                1
            );

            // El pedido ya existe desde que se creó la cotización, así que hay
            // que rehacerlo con los cambios; si no, el vendedor vería en el
            // dashboard los productos y totales viejos.
            if ($pedido) {
                $pedido->detalles()->delete();
                $pedido->metodosPago()->delete();
                $pedido->delete();
            }
            $this->crearPedidoDesdeCotizacion($cotizacion->fresh());

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización actualizada exitosamente',
                'cotizacion' => $cotizacion->load(['detalles', 'estadoCotizacion']),
                'codigo_cotizacion' => $cotizacion->codigo_cotizacion
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cotización no encontrada'
            ], 404);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar cotización',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener cotizaciones del cliente
     */
    public function misCotizaciones(Request $request)
    {
        try {
            $userCliente = $request->user();

            $cotizaciones = Cotizacion::with([
                'estadoCotizacion',
                'detalles.producto',
                'tracking.estadoCotizacion',
                'metodosPago'
            ])
            ->where('user_cliente_id', $userCliente->id)
            ->orderBy('fecha_cotizacion', 'desc')
            ->get();

            // Estado del pedido de cada cotizacion, en una sola consulta. Es el
            // estado real que ve el vendedor y del que depende si el cliente
            // todavia puede editarla, asi que es el que se le muestra a él
            // tambien (antes veia el de la cotizacion, siempre "Pendiente").
            $pedidosPorCotizacion = Pedido::with('estadoPedido')
                ->whereIn('cotizacion_id', $cotizaciones->pluck('id'))
                ->get()
                ->keyBy('cotizacion_id');

            $estadoPedidoPorCotizacion = $pedidosPorCotizacion->map(
                fn ($pedido) => $pedido->estado_pedido_id
            );

            return response()->json([
                'status' => 'success',
                'cotizaciones' => $cotizaciones->map(function($cotizacion) use ($estadoPedidoPorCotizacion, $pedidosPorCotizacion) {
                    return [
                        'id' => $cotizacion->id,
                        'codigo_cotizacion' => $cotizacion->codigo_cotizacion,
                        'fecha_cotizacion' => $cotizacion->fecha_cotizacion,
                        'fecha_vencimiento' => $cotizacion->fecha_vencimiento,
                        'subtotal' => $cotizacion->subtotal,
                        'igv' => $cotizacion->igv,
                        'costo_envio' => $cotizacion->costo_envio,
                        'total' => $cotizacion->total,
                        'moneda' => $cotizacion->moneda ?? 's',
                        'estado_actual' => $cotizacion->estadoCotizacion,
                        // Estado de la gestion del pedido: "En espera" mientras
                        // nadie lo atienda, luego "En preparacion" o "Cancelado".
                        'estado_pedido' => optional($pedidosPorCotizacion[$cotizacion->id] ?? null)->estadoPedido,
                        'codigo_pedido' => optional($pedidosPorCotizacion[$cotizacion->id] ?? null)->codigo_pedido,
                        // El cliente puede editar mientras el vendedor no haya
                        // entrado a atender el pedido (sigue "En espera").
                        'editable' => ($estadoPedidoPorCotizacion[$cotizacion->id] ?? Pedido::ESTADO_EN_ESPERA)
                            === Pedido::ESTADO_EN_ESPERA,
                        'forma_envio' => $cotizacion->forma_envio,
                        'direccion_envio' => $cotizacion->direccion_envio,
                        'observaciones' => $cotizacion->observaciones,
                        'cliente_nombre' => $cotizacion->cliente_nombre,
                        'cliente_email' => $cotizacion->cliente_email,
                        'telefono_contacto' => $cotizacion->telefono_contacto,
                        'numero_documento' => $cotizacion->numero_documento,
                        'metodo_pago_preferido' => $cotizacion->metodo_pago_preferido,
                        'metodos_pago' => $cotizacion->metodosPago,
                        'puede_convertir_compra' => $cotizacion->puedeConvertirseACompra(),
                        'esta_vencida' => $cotizacion->estaVencida(),
                        'productos' => $cotizacion->detalles->map(function($detalle) use ($cotizacion) {
                            return [
                                'producto_id' => $detalle->producto_id,
                                'nombre' => $detalle->nombre_producto,
                                'imagen' => $detalle->producto->imagen_url ?? null,
                                'cantidad' => $detalle->cantidad,
                                'precio_unitario' => $detalle->precio_unitario,
                                'subtotal' => $detalle->subtotal_linea,
                                'moneda' => $cotizacion->moneda ?? 's'
                            ];
                        }),
                        'detalles_count' => $cotizacion->detalles->count()
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener cotizaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado de una cotización
     */
    public function cambiarEstado(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'estado_cotizacion_id' => 'required|exists:estados_cotizacion,id',
            'comentario' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $cotizacion = Cotizacion::findOrFail($id);

            DB::beginTransaction();

            // Actualizar estado
            $cotizacion->update([
                'estado_cotizacion_id' => $request->estado_cotizacion_id
            ]);

            // Crear registro de tracking
            CotizacionTracking::crearRegistro(
                $cotizacion->id,
                $request->estado_cotizacion_id,
                $request->comentario ?: 'Estado cambiado desde panel administrativo',
                auth()->id()
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Estado de cotización actualizado correctamente',
                'cotizacion' => $cotizacion->load(['estadoCotizacion', 'tracking'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Convertir cotización a compra
     */
    public function convertirACompra(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'metodo_pago' => 'nullable|string|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $cotizacion = Cotizacion::findOrFail($id);

            // Verificar que pertenece al usuario
            $user = $request->user();
            if ($cotizacion->user_cliente_id !== $user->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No autorizado'
                ], 403);
            }

            // Verificar que puede convertirse a compra
            if (!$cotizacion->puedeConvertirseACompra()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta cotización no puede convertirse a compra'
                ], 422);
            }

            DB::beginTransaction();

            // Crear compra desde cotización
            $compra = Compra::crearDesdeCotizacion($cotizacion, $request->metodo_pago);

            // Actualizar estado de cotización
            $cotizacion->update([
                'estado_cotizacion_id' => 5 // Enviada para Compra
            ]);

            // Crear tracking de cotización
            CotizacionTracking::crearRegistro(
                $cotizacion->id,
                5, // Enviada para Compra
                'Cliente solicitó convertir cotización a compra',
                null // null porque el usuario es un cliente, no un admin de la tabla users
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización enviada para aprobación de compra',
                'compra' => $compra->load(['estadoCompra']),
                'codigo_compra' => $compra->codigo_compra
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al convertir cotización: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estados de cotización
     */
    public function getEstados()
    {
        try {
            $estados = EstadoCotizacion::ordenado()->get();

            return response()->json([
                'status' => 'success',
                'estados' => $estados
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener estados: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener tracking de una cotización
     */
    public function getTracking($id)
    {
        try {
            $cotizacion = Cotizacion::with([
                'estadoCotizacion',
                'tracking.estadoCotizacion',
                'tracking.usuario'
            ])->findOrFail($id);

            // Verificar permisos
            $user = request()->user();
            if ($cotizacion->user_cliente_id !== $user->id && !$this->isAdminUser($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No autorizado'
                ], 403);
            }

            return response()->json([
                'status' => 'success',
                'cotizacion' => [
                    'id' => $cotizacion->id,
                    'codigo_cotizacion' => $cotizacion->codigo_cotizacion,
                    'estado_actual' => $cotizacion->estadoCotizacion,
                    'puede_convertir_compra' => $cotizacion->puedeConvertirseACompra(),
                    'tracking' => $cotizacion->tracking->map(function($track) {
                        return [
                            'id' => $track->id,
                            'estado' => $track->estadoCotizacion,
                            'comentario' => $track->comentario,
                            'fecha_cambio' => $track->fecha_cambio,
                            'usuario' => $track->usuario ? $track->usuario->name : 'Sistema'
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener tracking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de cotizaciones
     */
    public function estadisticas()
    {
        try {
            $pendientes = Cotizacion::where('estado_cotizacion_id', 1)->count();
            $revision = Cotizacion::where('estado_cotizacion_id', 2)->count();
            $aprobadas = Cotizacion::where('estado_cotizacion_id', 3)->count();
            $rechazadas = Cotizacion::where('estado_cotizacion_id', 4)->count();
            $convertidas = Cotizacion::where('estado_cotizacion_id', 6)->count();

            return response()->json([
                'status' => 'success',
                'estadisticas' => [
                    'pendientes' => $pendientes,
                    'revision' => $revision,
                    'aprobadas' => $aprobadas,
                    'rechazadas' => $rechazadas,
                    'convertidas' => $convertidas,
                    'total' => $pendientes + $revision + $aprobadas + $rechazadas + $convertidas
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una cotización
     */
    public function destroy($id)
    {
        try {
            $cotizacion = Cotizacion::findOrFail($id);

            // Verificar que la cotización pertenece al usuario autenticado
            $user = request()->user();

            // Para clientes: solo pueden eliminar sus propias cotizaciones
            if ($user instanceof UserCliente) {
                if ($cotizacion->user_cliente_id !== $user->id) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No tienes permisos para eliminar esta cotización'
                    ], 403);
                }
            }
            // Para admins: verificar que tienen rol de admin
            elseif (!$this->isAdminUser($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No tienes permisos para eliminar cotizaciones'
                ], 403);
            }

            // Misma regla que editar: el cliente puede eliminar mientras el
            // vendedor no haya tomado el pedido, o sea mientras siga "En
            // espera". Un administrador no tiene ese límite.
            $pedido = $this->pedidoDeCotizacion($cotizacion);

            if ($user instanceof UserCliente && $pedido && !$pedido->esEditablePorCliente()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta cotización ya está siendo atendida y no se puede eliminar.'
                ], 422);
            }

            DB::beginTransaction();

            // El pedido que generó la cotización se va con ella; si no, quedaría
            // en la bandeja del vendedor apuntando a algo que ya no existe.
            if ($pedido) {
                $pedido->detalles()->delete();
                $pedido->metodosPago()->delete();
                $pedido->delete();
            }

            // Eliminar detalles de la cotización
            $cotizacion->detalles()->delete();

            // Eliminar tracking de la cotización
            $cotizacion->tracking()->delete();

            // Eliminar la cotización
            $cotizacion->delete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización eliminada exitosamente'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cotización no encontrada'
            ], 404);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al eliminar cotización',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Solicitar procesamiento de cotización (cliente pide cotización)
     */
    /**
     * Pedido generado por una cotización, si ya existe.
     *
     * Se busca por `cotizacion_id`; los pedidos viejos no lo tienen, así que se
     * cae al código de cotización dentro de las observaciones, que era como se
     * relacionaban antes.
     */
    private function pedidoDeCotizacion(Cotizacion $cotizacion): ?Pedido
    {
        return Pedido::where('cotizacion_id', $cotizacion->id)
            ->orWhere('observaciones', 'like', '%' . $cotizacion->codigo_cotizacion . '%')
            ->first();
    }

    /**
     * Crea el pedido correspondiente a una cotización.
     *
     * Nace "En espera": es el estado en el que el cliente todavía puede editar
     * su cotización, hasta que un vendedor o administrador lo pase a
     * "En preparación" o lo cancele.
     */
    private function crearPedidoDesdeCotizacion(Cotizacion $cotizacion): Pedido
    {
        $cotizacion->load('detalles.producto', 'metodosPago');
        $referencia = 'Generado desde cotización ' . $cotizacion->codigo_cotizacion;

        $pedido = Pedido::create([
            'codigo_pedido'      => 'PED-' . date('Ymd') . '-' . str_pad(Pedido::count() + 1, 4, '0', STR_PAD_LEFT),
            'cotizacion_id'      => $cotizacion->id,
            'user_cliente_id'    => $cotizacion->user_cliente_id,
            'cliente_id'         => $cotizacion->cliente_id,
            'fecha_pedido'       => now(),
            'subtotal'           => $cotizacion->subtotal,
            'igv'                => $cotizacion->igv,
            'descuento_total'    => $cotizacion->descuento_total ?? 0,
            'total'              => $cotizacion->total,
            'estado_pedido_id'   => Pedido::ESTADO_EN_ESPERA,
            'metodo_pago'        => $cotizacion->metodo_pago_preferido ?? 'Por confirmar',
            'forma_envio'        => $cotizacion->forma_envio,
            'costo_envio'        => $cotizacion->costo_envio ?? 0,
            'moneda'             => $cotizacion->moneda ?? 's',
            'direccion_envio'    => $cotizacion->direccion_envio,
            'telefono_contacto'  => $cotizacion->telefono_contacto,
            'cliente_nombre'     => $cotizacion->cliente_nombre,
            'cliente_email'      => $cotizacion->cliente_email,
            'numero_documento'   => $cotizacion->numero_documento,
            'departamento_id'    => $cotizacion->departamento_id,
            'provincia_id'       => $cotizacion->provincia_id,
            'distrito_id'        => $cotizacion->distrito_id,
            'departamento_nombre' => $cotizacion->departamento_nombre,
            'provincia_nombre'   => $cotizacion->provincia_nombre,
            'distrito_nombre'    => $cotizacion->distrito_nombre,
            'ubicacion_completa' => $cotizacion->ubicacion_completa,
            'observaciones'      => trim(($cotizacion->observaciones ? $cotizacion->observaciones . ' | ' : '') . $referencia),
        ]);

        foreach ($cotizacion->detalles as $detalle) {
            PedidoDetalle::create([
                'pedido_id'       => $pedido->id,
                'producto_id'     => $detalle->producto_id,
                'codigo_producto' => $detalle->producto->codigo_producto ?? '',
                'nombre_producto' => $detalle->nombre_producto,
                'cantidad'        => $detalle->cantidad,
                'precio_unitario' => $detalle->precio_unitario,
                'subtotal_linea'  => $detalle->subtotal_linea,
                'moneda'          => $detalle->moneda ?? $cotizacion->moneda ?? 's',
            ]);
        }

        // Copiar el desglose de métodos de pago combinados (Efectivo, Yape, Crédito, etc.)
        foreach ($cotizacion->metodosPago as $metodoPago) {
            \App\Models\PedidoMetodoPago::create([
                'pedido_id' => $pedido->id,
                'tipo'      => $metodoPago->tipo,
                'moneda'    => $metodoPago->moneda,
                'monto'     => $metodoPago->monto,
            ]);
        }

        return $pedido;
    }

    public function pedirCotizacion($id)
    {
        try {
            $cotizacion = Cotizacion::findOrFail($id);

            // Verificar que la cotización pertenece al usuario autenticado
            $user = request()->user();

            // Para clientes: solo pueden solicitar procesamiento de sus propias cotizaciones
            if ($user instanceof UserCliente) {
                if ($cotizacion->user_cliente_id !== $user->id) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No tienes permisos para solicitar esta cotización'
                    ], 403);
                }
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Acceso no autorizado'
                ], 403);
            }

            // Permitir estados: Pendiente (1) o En Revisión (2) — en revisión puede pasar
            // si el cliente presionó "pedir" pero el pedido no se creó por un error previo
            $estadosPermitidos = [1, 2]; // 1 = Pendiente, 2 = En Revisión
            if (!in_array($cotizacion->estado_cotizacion_id, $estadosPermitidos)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta cotización ya fue procesada o no puede ser solicitada nuevamente'
                ], 422);
            }

            // Verificar que la cotización no esté vencida
            if ($cotizacion->estaVencida()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No se puede solicitar una cotización vencida'
                ], 422);
            }

            // Evitar crear pedido duplicado si ya existe uno para esta cotización
            $pedidoExistente = $this->pedidoDeCotizacion($cotizacion);

            if ($pedidoExistente) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Tu solicitud ya fue registrada. El administrador se contactará contigo pronto.',
                    'cotizacion' => $cotizacion->load(['estadoCotizacion']),
                    'pedido_codigo' => $pedidoExistente->codigo_pedido,
                ]);
            }

            DB::beginTransaction();

            // Asegurar que el estado sea "En Revisión"
            if ($cotizacion->estado_cotizacion_id !== 2) {
                $cotizacion->update(['estado_cotizacion_id' => 2]);

                CotizacionTracking::crearRegistro(
                    $cotizacion->id,
                    2,
                    'Cliente solicitó el procesamiento de la cotización',
                    null
                );
            }

            $pedido = $this->crearPedidoDesdeCotizacion($cotizacion);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización enviada para revisión exitosamente. Nos contactaremos contigo pronto.',
                'cotizacion' => $cotizacion->load(['estadoCotizacion']),
                'pedido_codigo' => $pedido->codigo_pedido,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cotización no encontrada'
            ], 404);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al solicitar cotización',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generar PDF de una cotización
     */
    public function generarPDF($id)
    {
        try {
            $cotizacion = Cotizacion::with([
                'userCliente',
                'detalles.producto',
                'estadoCotizacion'
            ])->findOrFail($id);

            // Verificar permisos (solo el cliente propietario o admin)
            $user = request()->user();
            if ($cotizacion->user_cliente_id !== $user->id && !$this->isAdminUser($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No autorizado'
                ], 403);
            }

            // Obtener datos de la empresa
            $empresa = EmpresaInfo::first();
            if (!$empresa) {
                $empresa = (object) [
                    'nombre_empresa' => 'Tu Empresa',
                    'razon_social' => 'Razón Social',
                    'ruc' => '12345678901',
                    'direccion' => 'Dirección de la empresa',
                    'telefono' => '123-456-789',
                    'celular' => '987-654-321',
                    'email' => 'contacto@empresa.com',
                    'website' => 'www.empresa.com'
                ];
            }

            // Preparar datos para el PDF
            $productos = $cotizacion->detalles->map(function($detalle) {
                return [
                    'id' => $detalle->producto->id,
                    'nombre' => $detalle->producto->nombre,
                    'cantidad' => $detalle->cantidad,
                    'precio' => $detalle->precio_unitario,
                    'moneda' => $detalle->moneda ?? $cotizacion->moneda ?? 's'
                ];
            });

            $simboloMoneda = ($cotizacion->moneda ?? 's') === 'd' ? 'US$' : 'S/';

            $datos = [
                'numero_cotizacion' => $cotizacion->codigo_cotizacion,
                'fecha' => $cotizacion->fecha_cotizacion->format('d/m/Y'),
                'cliente' => $cotizacion->cliente_nombre,
                'email' => $cotizacion->cliente_email,
                'telefono' => $cotizacion->telefono_contacto,
                'direccion' => $cotizacion->direccion_envio,
                'departamento' => $cotizacion->departamento_nombre ?? 'N/A',
                'provincia' => $cotizacion->provincia_nombre ?? 'N/A',
                'distrito' => $cotizacion->distrito_nombre ?? 'N/A',
                'forma_envio' => $cotizacion->forma_envio,
                'tipo_pago' => $cotizacion->metodo_pago_preferido ?? 'N/A',
                'observaciones' => $cotizacion->observaciones,
                'subtotal' => $cotizacion->subtotal,
                'igv' => $cotizacion->igv,
                'costo_envio' => $cotizacion->costo_envio ?? 0,
                'total' => $cotizacion->total,
                'moneda' => $cotizacion->moneda ?? 's',
                'simbolo_moneda' => $simboloMoneda,
                'productos' => $productos,
                'empresa' => $empresa,
                'logo_base64' => null // Por ahora sin logo
            ];

            // Generar PDF usando la vista existente
            $pdf = Pdf::loadView('pdf.cotizacion', $datos);
            $pdf->setPaper('A4', 'portrait');

            // Retornar el PDF para descarga
            return $pdf->download("Cotizacion_{$cotizacion->codigo_cotizacion}.pdf");

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al generar PDF: ' . $e->getMessage()
            ], 500);
        }
    }
}
