<?php

namespace App\Http\Controllers;

use App\Models\Cotizacion;
use App\Models\CotizacionDetalle;
use App\Models\CotizacionTracking;
use App\Models\EstadoCotizacion;
use App\Models\UserCliente;
use App\Models\Producto;
use App\Models\Compra;
use App\Models\EmpresaInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class CotizacionesController extends Controller
{
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
                'compras.estadoCompra'
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
            'ubicacion_completa' => 'nullable|string'
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
            $productosValidados = [];

            foreach ($request->productos as $prod) {
                $producto = Producto::findOrFail($prod['producto_id']);

                $cantidad = $prod['cantidad'];
                $precioUnitario = $producto->precio_oferta ?: $producto->precio_venta;
                $subtotalLinea = $cantidad * $precioUnitario;

                $subtotal += $subtotalLinea;

                $productosValidados[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal_linea' => $subtotalLinea
                ];
            }

            $igv = $subtotal * 0.18;
            $costoEnvio = $request->costo_envio ?? 0;
            $total = $subtotal + $igv + $costoEnvio;

            // Crear cotización
            $cotizacion = Cotizacion::create([
                'codigo_cotizacion' => Cotizacion::generarCodigoCotizacion(),
                'user_cliente_id' => $userCliente->id,
                'fecha_cotizacion' => now(),
                'subtotal' => $subtotal,
                'igv' => $igv,
                'descuento_total' => 0,
                'total' => $total,
                'estado_cotizacion_id' => 1, // Pendiente
                'metodo_pago_preferido' => $request->metodo_pago_preferido,
                'direccion_envio' => $request->direccion_envio,
                'telefono_contacto' => $request->telefono_contacto,
                'observaciones' => $request->observaciones,
                'numero_documento' => $request->numero_documento,
                'cliente_nombre' => $request->cliente_nombre,
                'cliente_email' => $request->cliente_email,
                'forma_envio' => $request->forma_envio,
                'costo_envio' => $costoEnvio,
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

            // Crear detalles
            foreach ($productosValidados as $prod) {
                CotizacionDetalle::create([
                    'cotizacion_id' => $cotizacion->id,
                    'producto_id' => $prod['producto']->id,
                    'codigo_producto' => $prod['producto']->codigo_producto,
                    'nombre_producto' => $prod['producto']->nombre,
                    'cantidad' => $prod['cantidad'],
                    'precio_unitario' => $prod['precio_unitario'],
                    'subtotal_linea' => $prod['subtotal_linea']
                ]);
            }

            // Crear registro inicial de tracking
            CotizacionTracking::crearRegistro(
                $cotizacion->id,
                1, // Pendiente
                'Cotización creada desde el checkout del e-commerce',
                1 // Sistema
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización creada exitosamente',
                'cotizacion' => $cotizacion->load(['detalles', 'estadoCotizacion']),
                'codigo_cotizacion' => $cotizacion->codigo_cotizacion
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
     * Obtener cotizaciones del cliente
     */
    public function misCotizaciones(Request $request)
    {
        try {
            $userCliente = $request->user();

            $cotizaciones = Cotizacion::with([
                'estadoCotizacion',
                'detalles.producto',
                'tracking.estadoCotizacion'
            ])
            ->where('user_cliente_id', $userCliente->id)
            ->orderBy('fecha_cotizacion', 'desc')
            ->get();

            return response()->json([
                'status' => 'success',
                'cotizaciones' => $cotizaciones->map(function($cotizacion) {
                    return [
                        'id' => $cotizacion->id,
                        'codigo_cotizacion' => $cotizacion->codigo_cotizacion,
                        'fecha_cotizacion' => $cotizacion->fecha_cotizacion,
                        'fecha_vencimiento' => $cotizacion->fecha_vencimiento,
                        'total' => $cotizacion->total,
                        'estado_actual' => $cotizacion->estadoCotizacion,
                        'forma_envio' => $cotizacion->forma_envio,
                        'direccion_envio' => $cotizacion->direccion_envio,
                        'observaciones' => $cotizacion->observaciones,
                        'puede_convertir_compra' => $cotizacion->puedeConvertirseACompra(),
                        'esta_vencida' => $cotizacion->estaVencida(),
                        'productos' => $cotizacion->detalles->map(function($detalle) {
                            return [
                                'nombre' => $detalle->nombre_producto,
                                'cantidad' => $detalle->cantidad,
                                'precio_unitario' => $detalle->precio_unitario,
                                'subtotal' => $detalle->subtotal_linea
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
            if ($cotizacion->user_cliente_id !== $user->id && !$user->hasRole('admin')) {
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
            elseif (!$user->hasRole('admin')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No tienes permisos para eliminar cotizaciones'
                ], 403);
            }

            // Verificar que la cotización se puede eliminar (solo pendientes o rechazadas)
            $estadosEliminables = [1, 4]; // 1=Pendiente, 4=Rechazada
            if (!in_array($cotizacion->estado_cotizacion_id, $estadosEliminables)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No se puede eliminar una cotización que ya fue procesada'
                ], 422);
            }

            DB::beginTransaction();

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

            // Verificar que la cotización está en estado pendiente
            if ($cotizacion->estado_cotizacion_id !== 1) { // 1 = Pendiente
                return response()->json([
                    'status' => 'error',
                    'message' => 'Solo se pueden solicitar cotizaciones en estado pendiente'
                ], 422);
            }

            // Verificar que la cotización no esté vencida
            if ($cotizacion->estaVencida()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No se puede solicitar una cotización vencida'
                ], 422);
            }

            DB::beginTransaction();

            // Cambiar el estado de la cotización a "En Revisión" (ID 2)
            $cotizacion->update([
                'estado_cotizacion_id' => 2 // En Revisión
            ]);

            // Crear registro de tracking indicando que el cliente solicitó el procesamiento
            CotizacionTracking::crearRegistro(
                $cotizacion->id,
                2, // En Revisión
                'Cliente solicitó el procesamiento de la cotización',
                null // null porque el usuario es un cliente, no un admin de la tabla users
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización enviada para revisión exitosamente. Nos contactaremos contigo pronto.',
                'cotizacion' => $cotizacion->load(['estadoCotizacion'])
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
            if ($cotizacion->user_cliente_id !== $user->id && !$user->hasRole('admin')) {
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
                    'precio' => $detalle->precio_unitario
                ];
            });

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
                'total' => $cotizacion->total,
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