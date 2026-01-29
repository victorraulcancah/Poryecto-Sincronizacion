<?php

namespace App\Http\Controllers\Facturacion;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\GreenterService;
use App\Models\Cliente;
use App\Models\Producto;
use App\Models\SerieComprobante;
use App\Models\Comprobante;
use App\Models\ComprobanteDetalle;
use App\Models\Venta;
use App\Models\VentaDetalle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class FacturacionManualController extends Controller
{
    protected $greenterService;

    public function __construct(GreenterService $greenterService)
    {
        $this->greenterService = $greenterService;
    }

    /**
     * Listar comprobantes (API)
     */
    public function index(Request $request)
    {
        $query = Comprobante::with(['cliente', 'detalles']);

        // Filtros
        if ($request->filled('fecha_desde')) {
            $query->where('fecha_emision', '>=', $request->fecha_desde);
        }
        
        if ($request->filled('fecha_hasta')) {
            $query->where('fecha_emision', '<=', $request->fecha_hasta);
        }
        
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        
        if ($request->filled('tipo_comprobante')) {
            $query->where('tipo_comprobante', $request->tipo_comprobante);
        }

        $comprobantes = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $comprobantes
        ]);
    }

    /**
     * Crear factura/boleta manual (Semana 2 - Optimizado)
     */
    public function store(Request $request)
    {
        $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'tipo_comprobante' => 'required|in:01,03',
            'serie_id' => 'required|exists:series_comprobantes,id',
            'fecha_emision' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|numeric|min:0.01',
            'productos.*.precio_unitario' => 'required|numeric|min:0.01',
            'productos.*.descuento' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            // Obtener datos del cliente y serie
            $cliente = Cliente::findOrFail($request->cliente_id);
            $serie = SerieComprobante::findOrFail($request->serie_id);
            
            // Verificar que la serie corresponda al tipo de comprobante
            if ($serie->tipo_comprobante !== $request->tipo_comprobante) {
                throw new \Exception('La serie seleccionada no corresponde al tipo de comprobante');
            }

            // Generar correlativo
            $correlativo = $serie->siguienteCorrelativo();

            // Calcular totales
            $subtotal = 0;
            $totalIgv = 0;
            $total = 0;
            $detalles = [];

            foreach ($request->productos as $item) {
                $producto = Producto::findOrFail($item['producto_id']);

                $cantidad = (float)$item['cantidad'];
                $precioUnitario = (float)$item['precio_unitario'];
                $descuento = (float)($item['descuento'] ?? 0);

                // VALIDAR STOCK DISPONIBLE
                if ($producto->stock < $cantidad) {
                    throw new \Exception("Stock insuficiente para el producto: {$producto->nombre}. Stock disponible: {$producto->stock}");
                }

                // Calcular subtotal de la línea
                $subtotalLinea = $cantidad * $precioUnitario;
                $subtotalLineaConDescuento = $subtotalLinea - $descuento;

                // Calcular IGV (18%)
                $igvLinea = $subtotalLineaConDescuento * 0.18;
                $totalLinea = $subtotalLineaConDescuento + $igvLinea;

                $detalles[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'descuento' => $descuento,
                    'subtotal_linea' => $subtotalLineaConDescuento,
                    'igv_linea' => $igvLinea,
                    'total_linea' => $totalLinea,
                ];

                $subtotal += $subtotalLineaConDescuento;
                $totalIgv += $igvLinea;
                $total += $totalLinea;
            }

            // Crear comprobante
            $comprobante = Comprobante::create([
                'tipo_comprobante' => $request->tipo_comprobante,
                'serie' => $serie->serie,
                'correlativo' => $correlativo,
                'fecha_emision' => $request->fecha_emision,
                'cliente_id' => $cliente->id,
                'cliente_tipo_documento' => $cliente->tipo_documento,
                'cliente_numero_documento' => $cliente->numero_documento,
                'cliente_razon_social' => $cliente->razon_social,
                'cliente_direccion' => $cliente->direccion,
                'moneda' => 'PEN',
                'operacion_gravada' => round($subtotal, 2),
                'total_igv' => round($totalIgv, 2),
                'importe_total' => round($total, 2),
                'user_id' => Auth::id() ?? 1,
                'estado' => 'PENDIENTE'
            ]);

            // Crear detalles del comprobante Y ACTUALIZAR STOCK
            foreach ($detalles as $index => $detalle) {
                ComprobanteDetalle::create([
                    'comprobante_id' => $comprobante->id,
                    'item' => $index + 1,
                    'producto_id' => $detalle['producto']->id,
                    'codigo_producto' => $detalle['producto']->codigo_producto,
                    'descripcion' => $detalle['producto']->nombre,
                    'unidad_medida' => 'NIU',
                    'cantidad' => $detalle['cantidad'],
                    'valor_unitario' => round($detalle['precio_unitario'] / 1.18, 2), // Precio sin IGV
                    'precio_unitario' => $detalle['precio_unitario'],
                    'descuento' => $detalle['descuento'],
                    'valor_venta' => $detalle['subtotal_linea'],
                    'porcentaje_igv' => 18.00,
                    'igv' => $detalle['igv_linea'],
                    'tipo_afectacion_igv' => '10',
                    'importe_total' => $detalle['total_linea']
                ]);

                // ACTUALIZAR STOCK DEL PRODUCTO
                $detalle['producto']->decrement('stock', $detalle['cantidad']);

                Log::info('Stock actualizado por facturación manual', [
                    'producto_id' => $detalle['producto']->id,
                    'producto' => $detalle['producto']->nombre,
                    'cantidad_descontada' => $detalle['cantidad'],
                    'stock_anterior' => $detalle['producto']->stock + $detalle['cantidad'],
                    'stock_actual' => $detalle['producto']->stock
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Comprobante creado exitosamente',
                'comprobante' => $comprobante->load('detalles', 'cliente')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear comprobante: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar comprobante (API)
     */
    public function show($id)
    {
        $comprobante = Comprobante::with(['detalles.producto', 'cliente'])->findOrFail($id);
        
        return response()->json([
            'success' => true,
            'data' => $comprobante
        ]);
    }

    /**
     * Enviar comprobante a SUNAT
     */
    public function enviarSUNAT($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);
            
            if ($comprobante->estado !== 'PENDIENTE') {
                throw new \Exception('El comprobante ya fue procesado');
            }

            // Crear venta temporal para usar con GreenterService
            $venta = $this->crearVentaDesdeComprobante($comprobante);
            
            // Generar factura electrónica
            $resultado = $this->greenterService->generarFactura($venta->id);
            
            if ($resultado['success']) {
                $comprobante->refresh();
                return response()->json([
                    'success' => true,
                    'message' => 'Comprobante enviado a SUNAT exitosamente',
                    'comprobante' => $comprobante
                ]);
            } else {
                throw new \Exception($resultado['error']);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar a SUNAT: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Descargar PDF del comprobante
     */
    public function descargarPdf($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);
            
            if (!$comprobante->pdf_base64) {
                throw new \Exception('PDF no disponible para este comprobante');
            }

            $pdfContent = base64_decode($comprobante->pdf_base64);
            $filename = strtolower($comprobante->tipo_comprobante === '01' ? 'factura' : 'boleta') . 
                       '-' . $comprobante->serie . '-' . $comprobante->correlativo . '.pdf';

            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Content-Length', strlen($pdfContent));

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Descargar XML del comprobante
     */
    public function descargarXml($id)
    {
        try {
            $comprobante = Comprobante::findOrFail($id);
            
            if (!$comprobante->xml_firmado) {
                throw new \Exception('XML no disponible para este comprobante');
            }

            $filename = strtolower($comprobante->tipo_comprobante === '01' ? 'factura' : 'boleta') . 
                       '-' . $comprobante->serie . '-' . $comprobante->correlativo . '.xml';

            return response($comprobante->xml_firmado)
                ->header('Content-Type', 'application/xml')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al descargar XML: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener clientes (API)
     */
    public function getClientes()
    {
        $clientes = Cliente::where('activo', true)
            ->select('id', 'tipo_documento', 'numero_documento', 'razon_social', 'direccion')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $clientes
        ]);
    }

    /**
     * Obtener series (API)
     */
    public function getSeries(Request $request)
    {
        $query = SerieComprobante::query();

        // Filtrar por estado si se proporciona
        if ($request->filled('estado')) {
            $estado = $request->estado === 'activo' ? true : false;
            $query->where('activo', $estado);
        } else {
            // Por defecto, solo series activas
            $query->where('activo', true);
        }

        // Filtrar por tipo de comprobante si se proporciona
        if ($request->filled('tipo_comprobante')) {
            $query->where('tipo_comprobante', $request->tipo_comprobante);
        }

        $series = $query->select('id', 'tipo_comprobante', 'serie', 'correlativo', 'activo')
            ->orderBy('tipo_comprobante')
            ->orderBy('serie')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $series
        ]);
    }

    /**
     * Obtener estadísticas de facturación
     */
    public function estadisticas()
    {
        $estadisticas = [
            'total_comprobantes' => Comprobante::count(),
            'comprobantes_por_estado' => Comprobante::selectRaw('estado, COUNT(*) as total')
                ->groupBy('estado')
                ->get()
                ->pluck('total', 'estado'),
            'comprobantes_por_tipo' => Comprobante::selectRaw('tipo_comprobante, COUNT(*) as total')
                ->groupBy('tipo_comprobante')
                ->get()
                ->pluck('total', 'tipo_comprobante'),
            'total_ventas' => Comprobante::sum('importe_total'),
            'promedio_venta' => Comprobante::avg('importe_total'),
            'comprobantes_hoy' => Comprobante::whereDate('created_at', today())->count(),
            'comprobantes_mes' => Comprobante::whereMonth('created_at', now()->month)->count(),
            'ultimos_logs_sunat' => \App\Models\SunatLog::with('comprobante')
                ->latest()
                ->limit(10)
                ->get()
        ];

        return response()->json([
            'success' => true,
            'data' => $estadisticas
        ]);
    }

    /**
     * Obtener productos para autocompletado
     */
    public function buscarProductos(Request $request)
    {
        $query = $request->get('q');
        
            $productos = Producto::where('activo', true)
            ->where(function($q) use ($query) {
                $q->where('nombre', 'like', "%{$query}%")
                  ->orWhere('codigo_producto', 'like', "%{$query}%");
            })
            ->limit(10)
            ->get(['id', 'codigo_producto as codigo', 'nombre', 'precio_venta']);

        return response()->json($productos);
    }

    /**
     * Crear venta temporal desde comprobante para usar con GreenterService
     */
    private function crearVentaDesdeComprobante($comprobante)
    {
        // Crear venta temporal
        $venta = Venta::create([
            'cliente_id' => $comprobante->cliente_id,
            'fecha_venta' => $comprobante->fecha_emision,
            'subtotal' => $comprobante->operacion_gravada,
            'igv' => $comprobante->total_igv,
            'total' => $comprobante->importe_total,
            'estado' => 'FACTURADO',
            'user_id' => $comprobante->user_id
        ]);

        // Crear detalles de venta
        foreach ($comprobante->detalles as $detalle) {
            VentaDetalle::create([
                'venta_id' => $venta->id,
                'producto_id' => $detalle->producto_id,
                'codigo_producto' => $detalle->codigo_producto,
                'nombre_producto' => $detalle->descripcion,
                'cantidad' => $detalle->cantidad,
                'precio_unitario' => $detalle->precio_unitario,
                'precio_sin_igv' => $detalle->valor_unitario,
                'descuento_unitario' => $detalle->descuento / $detalle->cantidad,
                'subtotal_linea' => $detalle->valor_venta,
                'igv_linea' => $detalle->igv,
                'total_linea' => $detalle->importe_total
            ]);
        }

        return $venta;
    }
}
