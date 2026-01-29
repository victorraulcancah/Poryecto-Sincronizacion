<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\CompraDetalle;
use App\Models\CompraTracking;
use App\Models\EstadoCompra;
use App\Models\Cotizacion;
use App\Models\CotizacionTracking;
use App\Models\Producto;
use App\Services\FacturacionComprasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ComprasController extends Controller
{
    /**
     * Obtener todas las compras (para admin)
     */
    public function index(Request $request)
    {
        try {
            $query = Compra::with([
                'cotizacion',
                'cliente',
                'userCliente',
                'estadoCompra',
                'aprobadaPor',
                'detalles.producto',
                'tracking.estadoCompra'
            ]);

            // Filtros
            if ($request->has('estado_compra_id') && $request->estado_compra_id !== '') {
                $query->where('estado_compra_id', $request->estado_compra_id);
            }

            if ($request->has('user_cliente_id') && $request->user_cliente_id !== '') {
                $query->where('user_cliente_id', $request->user_cliente_id);
            }

            if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
                $query->whereBetween('fecha_compra', [$request->fecha_inicio, $request->fecha_fin]);
            }

            if ($request->has('pendientes_aprobacion') && $request->pendientes_aprobacion) {
                $query->where('estado_compra_id', 1); // Pendiente Aprobación
            }

            if ($request->has('search') && $request->search !== '') {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('codigo_compra', 'LIKE', "%{$search}%")
                      ->orWhere('cliente_nombre', 'LIKE', "%{$search}%")
                      ->orWhere('cliente_email', 'LIKE', "%{$search}%")
                      ->orWhereHas('cotizacion', function ($cotQuery) use ($search) {
                          $cotQuery->where('codigo_cotizacion', 'LIKE', "%{$search}%");
                      })
                      ->orWhereHas('userCliente', function ($userQuery) use ($search) {
                          $userQuery->where('nombres', 'LIKE', "%{$search}%")
                                   ->orWhere('apellidos', 'LIKE', "%{$search}%")
                                   ->orWhere('email', 'LIKE', "%{$search}%");
                      });
                });
            }

            $compras = $query->orderBy('fecha_compra', 'desc')->get();

            return response()->json([
                'status' => 'success',
                'compras' => $compras
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener compras',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar una compra específica
     */
    public function show($id)
    {
        try {
            $compra = Compra::with([
                'cotizacion.estadoCotizacion',
                'cliente',
                'userCliente',
                'estadoCompra',
                'aprobadaPor',
                'user',
                'detalles.producto',
                'tracking.estadoCompra.usuario'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'compra' => $compra
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Compra no encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Crear una nueva compra desde ecommerce
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'cliente_nombre' => 'required|string|max:255',
            'cliente_email' => 'required|email|max:255',
            'direccion_envio' => 'required|string|max:500',
            'telefono_contacto' => 'required|string|max:20',
            'forma_envio' => 'required|in:delivery,recojo_tienda,envio_provincia',
            'metodo_pago' => 'required|string|max:50',
            'costo_envio' => 'numeric|min:0',
            'numero_documento' => 'nullable|string|max:11',
            'ubicacion_completa' => 'nullable|string|max:500',
            'observaciones' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();

            // Verificar que sea un cliente del ecommerce
            if (!$user instanceof \App\Models\UserCliente) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Solo clientes pueden crear compras desde ecommerce'
                ], 403);
            }

            DB::beginTransaction();

            // Validar stock de productos
            $productosData = [];
            $totalCompra = 0;

            foreach ($request->productos as $productoRequest) {
                $producto = Producto::findOrFail($productoRequest['producto_id']);

                if ($producto->stock < $productoRequest['cantidad']) {
                    throw new \Exception("Stock insuficiente para el producto: {$producto->nombre}. Stock disponible: {$producto->stock}");
                }

                $subtotal = $producto->precio_venta * $productoRequest['cantidad'];
                $totalCompra += $subtotal;

                $productosData[] = [
                    'producto' => $producto,
                    'cantidad' => $productoRequest['cantidad'],
                    'precio_unitario' => $producto->precio_venta,
                    'subtotal' => $subtotal
                ];
            }

            // Agregar costo de envío
            $costoEnvio = $request->costo_envio ?? 0;

            // Calcular subtotal (sin costo de envío)
            $subtotal = $totalCompra;

            // Calcular IGV (18% del subtotal)
            $igv = $subtotal * 0.18;

            // Total final incluye subtotal + IGV + costo de envío
            $totalFinal = $subtotal + $igv + $costoEnvio;

            // Generar código único para la compra
            $codigoCompra = 'COMP-' . date('Ymd') . '-' . str_pad(Compra::count() + 1, 4, '0', STR_PAD_LEFT);

            // Crear la compra
            $compra = Compra::create([
                'codigo_compra' => $codigoCompra,
                'user_cliente_id' => $user->id,
                'cliente_nombre' => $request->cliente_nombre,
                'cliente_email' => $request->cliente_email,
                'numero_documento' => $request->numero_documento,
                'direccion_envio' => $request->direccion_envio,
                'telefono_contacto' => $request->telefono_contacto,
                'forma_envio' => $request->forma_envio,
                'metodo_pago' => $request->metodo_pago,
                'ubicacion_completa' => $request->ubicacion_completa,
                'observaciones' => $request->observaciones,
                'costo_envio' => $costoEnvio,
                'subtotal' => $subtotal,
                'igv' => $igv,
                'total' => $totalFinal,
                'fecha_compra' => now(),
                'estado_compra_id' => 1 // Pendiente Aprobación
            ]);

            // Crear detalles de la compra
            foreach ($productosData as $productoData) {
                CompraDetalle::create([
                    'compra_id' => $compra->id,
                    'producto_id' => $productoData['producto']->id,
                    'nombre_producto' => $productoData['producto']->nombre,
                    'codigo_producto' => $productoData['producto']->codigo_producto,
                    'cantidad' => $productoData['cantidad'],
                    'precio_unitario' => $productoData['precio_unitario'],
                    'subtotal_linea' => $productoData['subtotal']
                ]);
            }

            // Crear primer registro de tracking
            CompraTracking::crearRegistro(
                $compra->id,
                1, // Pendiente Aprobación
                'Compra creada desde ecommerce',
                null // Usuario desde ecommerce no necesita tracking de usuario admin
            );

            DB::commit();

            // Cargar relaciones para la respuesta
            $compra->load(['estadoCompra', 'detalles.producto']);

            return response()->json([
                'status' => 'success',
                'message' => 'Compra creada exitosamente',
                'codigo_compra' => $compra->codigo_compra,
                'compra' => [
                    'id' => $compra->id,
                    'codigo_compra' => $compra->codigo_compra,
                    'total' => $compra->total,
                    'estado_actual' => $compra->estadoCompra,
                    'fecha_compra' => $compra->fecha_compra,
                    'productos' => $compra->detalles->map(function($detalle) {
                        return [
                            'nombre' => $detalle->nombre_producto,
                            'cantidad' => $detalle->cantidad,
                            'precio_unitario' => $detalle->precio_unitario,
                            'subtotal' => $detalle->subtotal
                        ];
                    })
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear compra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener compras del cliente
     */
    public function misCompras(Request $request)
    {
        try {
            $userCliente = $request->user();

            $compras = Compra::with([
                'cotizacion',
                'estadoCompra',
                'detalles.producto',
                'tracking.estadoCompra'
            ])
            ->where('user_cliente_id', $userCliente->id)
            ->orderBy('fecha_compra', 'desc')
            ->get();

            return response()->json([
                'status' => 'success',
                'compras' => $compras->map(function($compra) {
                    return [
                        'id' => $compra->id,
                        'codigo_compra' => $compra->codigo_compra,
                        'codigo_cotizacion' => $compra->cotizacion?->codigo_cotizacion,
                        'fecha_compra' => $compra->fecha_compra,
                        'fecha_aprobacion' => $compra->fecha_aprobacion,
                        'total' => $compra->total,
                        'estado_actual' => $compra->estadoCompra,
                        'metodo_pago' => $compra->metodo_pago,
                        'forma_envio' => $compra->forma_envio,
                        'direccion_envio' => $compra->direccion_envio,
                        'esta_aprobada' => $compra->estaAprobada(),
                        'puede_cancelarse' => $compra->puedeCancelarse(),
                        'productos' => $compra->detalles->map(function($detalle) {
                            return [
                                'nombre' => $detalle->nombre_producto,
                                'cantidad' => $detalle->cantidad,
                                'precio_unitario' => $detalle->precio_unitario,
                                'subtotal' => $detalle->subtotal_linea
                            ];
                        }),
                        'detalles_count' => $compra->detalles->count()
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener compras: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aprobar una compra
     */
    public function aprobar(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
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
            $compra = Compra::findOrFail($id);

            // Verificar que está pendiente de aprobación
            if ($compra->estado_compra_id !== 1) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta compra no está pendiente de aprobación'
                ], 422);
            }

            DB::beginTransaction();

            // Verificar stock de todos los productos
            foreach ($compra->detalles as $detalle) {
                if (!$detalle->tieneStockSuficiente()) {
                    throw new \Exception("Stock insuficiente para el producto: {$detalle->nombre_producto}");
                }
            }

            // Aprobar compra
            $compra->aprobar(auth()->id(), $request->comentario);

            // Actualizar stock de productos
            foreach ($compra->detalles as $detalle) {
                $detalle->producto->decrement('stock', $detalle->cantidad);
            }

            // Si viene de cotización, actualizar estado de cotización
            if ($compra->cotizacion) {
                $compra->cotizacion->update([
                    'estado_cotizacion_id' => 6 // Convertida a Compra
                ]);

                CotizacionTracking::crearRegistro(
                    $compra->cotizacion->id,
                    6,
                    "Compra {$compra->codigo_compra} aprobada exitosamente",
                    auth()->id()
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Compra aprobada exitosamente',
                'compra' => $compra->load(['estadoCompra', 'tracking'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al aprobar compra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rechazar una compra
     */
    public function rechazar(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'comentario' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'El comentario es requerido para rechazar',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $compra = Compra::findOrFail($id);

            // Verificar que puede ser rechazada
            if (!in_array($compra->estado_compra_id, [1, 2])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta compra no puede ser rechazada'
                ], 422);
            }

            DB::beginTransaction();

            // Rechazar compra
            $compra->rechazar(auth()->id(), $request->comentario);

            // Si viene de cotización, actualizar estado de cotización a Aprobada
            // para que el cliente pueda intentar nuevamente
            if ($compra->cotizacion) {
                $compra->cotizacion->update([
                    'estado_cotizacion_id' => 3 // Aprobada (puede volver a intentar)
                ]);

                CotizacionTracking::crearRegistro(
                    $compra->cotizacion->id,
                    3,
                    "Compra {$compra->codigo_compra} fue rechazada. Motivo: {$request->comentario}",
                    auth()->id()
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Compra rechazada',
                'compra' => $compra->load(['estadoCompra', 'tracking'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al rechazar compra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado de una compra
     */
    public function cambiarEstado(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'estado_compra_id' => 'required|exists:estados_compra,id',
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
            $compra = Compra::findOrFail($id);

            DB::beginTransaction();

            // Actualizar estado
            $compra->update([
                'estado_compra_id' => $request->estado_compra_id
            ]);

            // Crear registro de tracking
            CompraTracking::crearRegistro(
                $compra->id,
                $request->estado_compra_id,
                $request->comentario ?: 'Estado cambiado desde panel administrativo',
                auth()->id()
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Estado de compra actualizado correctamente',
                'compra' => $compra->load(['estadoCompra', 'tracking'])
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
     * Cancelar una compra (solo cliente)
     */
    public function cancelar(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'motivo' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'El motivo de cancelación es requerido',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $compra = Compra::findOrFail($id);
            $user = $request->user();

            // Verificar que pertenece al usuario
            if ($compra->user_cliente_id !== $user->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No autorizado'
                ], 403);
            }

            // Verificar que puede cancelarse
            if (!$compra->puedeCancelarse()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta compra no puede ser cancelada'
                ], 422);
            }

            DB::beginTransaction();

            // Cancelar compra
            $compra->update([
                'estado_compra_id' => 7 // Cancelada
            ]);

            // Crear tracking
            CompraTracking::crearRegistro(
                $compra->id,
                7,
                "Cancelada por el cliente. Motivo: {$request->motivo}",
                $user->id
            );

            // Si viene de cotización, regresar a estado Aprobada
            if ($compra->cotizacion) {
                $compra->cotizacion->update([
                    'estado_cotizacion_id' => 3 // Aprobada
                ]);

                CotizacionTracking::crearRegistro(
                    $compra->cotizacion->id,
                    3,
                    "Compra {$compra->codigo_compra} cancelada por el cliente",
                    null // null porque el usuario es un cliente, no un admin de la tabla users
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Compra cancelada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cancelar compra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estados de compra
     */
    public function getEstados()
    {
        try {
            $estados = EstadoCompra::ordenado()->get();

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
     * Obtener tracking de una compra
     */
    public function getTracking($id)
    {
        try {
            $compra = Compra::with([
                'estadoCompra',
                'tracking.estadoCompra',
                'tracking.usuario'
            ])->findOrFail($id);

            // Verificar permisos
            $user = request()->user();
            if ($compra->user_cliente_id !== $user->id && !$user->hasRole('admin')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No autorizado'
                ], 403);
            }

            return response()->json([
                'status' => 'success',
                'compra' => [
                    'id' => $compra->id,
                    'codigo_compra' => $compra->codigo_compra,
                    'estado_actual' => $compra->estadoCompra,
                    'esta_aprobada' => $compra->estaAprobada(),
                    'puede_cancelarse' => $compra->puedeCancelarse(),
                    'tracking' => $compra->tracking->map(function($track) {
                        return [
                            'id' => $track->id,
                            'estado' => $track->estadoCompra,
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
     * Obtener estadísticas de compras
     */
    public function estadisticas()
    {
        try {
            $pendientesAprobacion = Compra::where('estado_compra_id', 1)->count();
            $aprobadas = Compra::where('estado_compra_id', 2)->count();
            $pagadas = Compra::where('estado_compra_id', 3)->count();
            $preparacion = Compra::where('estado_compra_id', 4)->count();
            $enviadas = Compra::where('estado_compra_id', 5)->count();
            $entregadas = Compra::where('estado_compra_id', 6)->count();
            $canceladas = Compra::where('estado_compra_id', 7)->count();
            $rechazadas = Compra::where('estado_compra_id', 8)->count();

            return response()->json([
                'status' => 'success',
                'estadisticas' => [
                    'pendientes_aprobacion' => $pendientesAprobacion,
                    'aprobadas' => $aprobadas,
                    'pagadas' => $pagadas,
                    'preparacion' => $preparacion,
                    'enviadas' => $enviadas,
                    'entregadas' => $entregadas,
                    'canceladas' => $canceladas,
                    'rechazadas' => $rechazadas,
                    'total' => $pendientesAprobacion + $aprobadas + $pagadas + $preparacion + $enviadas + $entregadas
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
     * Procesar pago de una compra aprobada
     */
    public function procesarPago(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'metodo_pago' => 'required|string|max:50',
            'referencia_pago' => 'nullable|string|max:255',
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
            $compra = Compra::findOrFail($id);

            // Verificar que está aprobada
            if ($compra->estado_compra_id !== 2) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Esta compra debe estar aprobada para procesar el pago'
                ], 422);
            }

            DB::beginTransaction();

            // Actualizar compra con información de pago
            $compra->update([
                'estado_compra_id' => 3, // Pagada
                'metodo_pago' => $request->metodo_pago
            ]);

            // Crear tracking de pago
            $comentario = $request->comentario ?: "Pago procesado vía {$request->metodo_pago}";
            if ($request->referencia_pago) {
                $comentario .= ". Referencia: {$request->referencia_pago}";
            }

            CompraTracking::crearRegistro(
                $compra->id,
                3,
                $comentario,
                auth()->id()
            );

            DB::commit();

            // FACTURACIÓN AUTOMÁTICA - Si la compra requiere factura, generarla
            $resultadoFacturacion = null;
            if ($compra->requiereFacturacion()) {
                try {
                    $facturacionService = app(FacturacionComprasService::class);
                    $resultadoFacturacion = $facturacionService->generarComprobanteAutomatico($compra);

                    if ($resultadoFacturacion['success']) {
                        Log::info('Comprobante generado automáticamente al procesar pago', [
                            'compra_id' => $compra->id,
                            'comprobante_id' => $resultadoFacturacion['comprobante']->id
                        ]);
                    } else {
                        Log::warning('Falló la facturación automática al procesar pago', [
                            'compra_id' => $compra->id,
                            'error' => $resultadoFacturacion['error'] ?? 'Error desconocido'
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Error en facturación automática', [
                        'compra_id' => $compra->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $respuesta = [
                'status' => 'success',
                'message' => 'Pago procesado exitosamente',
                'compra' => $compra->load(['estadoCompra', 'comprobante'])
            ];

            // Agregar información de facturación si se generó
            if ($resultadoFacturacion && $resultadoFacturacion['success']) {
                $respuesta['facturacion'] = [
                    'comprobante_generado' => true,
                    'numero_comprobante' => $resultadoFacturacion['comprobante']->serie . '-' . $resultadoFacturacion['comprobante']->correlativo,
                    'estado_sunat' => $resultadoFacturacion['comprobante']->estado
                ];
            } elseif ($resultadoFacturacion && !$resultadoFacturacion['success']) {
                $respuesta['facturacion'] = [
                    'comprobante_generado' => false,
                    'mensaje' => 'El comprobante se generará en segundo plano',
                    'error' => $resultadoFacturacion['error'] ?? null
                ];
            }

            return response()->json($respuesta);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'status' => 'error',
                'message' => 'Error al procesar pago: ' . $e->getMessage()
            ], 500);
        }
    }
}