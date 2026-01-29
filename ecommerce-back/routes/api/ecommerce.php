<?php

use App\Http\Controllers\CartController;
use App\Http\Controllers\Cliente\MisDocumentosController;
use App\Http\Controllers\ClientesController;
use App\Http\Controllers\ComprasController;
use App\Http\Controllers\CotizacionesController;
use App\Http\Controllers\FavoritoController;
use App\Http\Controllers\PedidosController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de E-commerce
|--------------------------------------------------------------------------
|
| Funcionalidad de tienda online: carrito, pedidos, cotizaciones y compras
|
*/

Route::middleware('auth:sanctum')->group(function () {

    // ============================================
    // CARRITO DE COMPRAS
    // ============================================
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/add', [CartController::class, 'add']);
        Route::put('/update/{producto_id}', [CartController::class, 'update']);
        Route::delete('/remove/{producto_id}', [CartController::class, 'remove']);
        Route::delete('/clear', [CartController::class, 'clear']);
        Route::post('/sync', [CartController::class, 'sync']);
    });

    // ============================================
    // FAVORITOS
    // ============================================
    Route::prefix('favoritos')->group(function () {
        Route::get('/', [FavoritoController::class, 'index']);
        Route::post('/', [FavoritoController::class, 'store']);
        Route::delete('/{productoId}', [FavoritoController::class, 'destroy']);
    });

    // ============================================
    // PEDIDOS
    // ============================================
    Route::prefix('pedidos')->middleware('permission:pedidos.ver')->group(function () {
        Route::get('/', [PedidosController::class, 'index']);
        Route::get('/estados', [PedidosController::class, 'getEstados']);
        Route::get('/metodos-pago', [PedidosController::class, 'getMetodosPago']);
        Route::get('/estadisticas', [PedidosController::class, 'estadisticas']);
        Route::get('/mis-pedidos', [PedidosController::class, 'misPedidos']);
        Route::get('/{id}', [PedidosController::class, 'show'])->middleware('permission:pedidos.show');
        Route::get('/{id}/tracking', [PedidosController::class, 'getTrackingPedido']);
        Route::get('/usuario/{userId}', [PedidosController::class, 'pedidosPorUsuario']);

        Route::post('/ecommerce', [PedidosController::class, 'crearPedidoEcommerce'])->middleware('permission:pedidos.create');
        Route::put('/{id}/estado', [PedidosController::class, 'updateEstado'])->middleware('permission:pedidos.edit');
        Route::patch('/{id}/estado', [PedidosController::class, 'actualizarEstado'])->middleware('permission:pedidos.edit');
        Route::post('/{id}/cambiar-estado', [PedidosController::class, 'cambiarEstado'])->middleware('permission:pedidos.edit');
        Route::delete('/{id}', [PedidosController::class, 'destroy'])->middleware('permission:pedidos.delete');
    });

    // ============================================
    // COTIZACIONES
    // ============================================
    Route::prefix('cotizaciones')->group(function () {
        Route::post('/ecommerce', [CotizacionesController::class, 'crearCotizacionEcommerce']);
        Route::get('/mis-cotizaciones', [CotizacionesController::class, 'misCotizaciones']);
        Route::get('/{id}/pdf', [CotizacionesController::class, 'generarPDF']);
        Route::post('/{id}/convertir-compra', [CotizacionesController::class, 'convertirACompra']);
        Route::post('/{id}/pedir', [CotizacionesController::class, 'pedirCotizacion']);
    });

    Route::prefix('cotizaciones')->middleware('permission:cotizaciones.ver')->group(function () {
        Route::get('/', [CotizacionesController::class, 'index']);
        Route::get('/estadisticas', [CotizacionesController::class, 'estadisticas']);
        Route::get('/estados/lista', [CotizacionesController::class, 'getEstados']);
        Route::get('/{id}', [CotizacionesController::class, 'show'])->middleware('permission:cotizaciones.show');
        Route::get('/{id}/tracking', [CotizacionesController::class, 'getTracking']);
        Route::delete('/{id}', [CotizacionesController::class, 'destroy']);

        Route::post('/ecommerce', [CotizacionesController::class, 'crearCotizacionEcommerce'])->middleware('permission:cotizaciones.create');
        Route::post('/{id}/convertir-compra', [CotizacionesController::class, 'convertirACompra'])->middleware('permission:cotizaciones.convertir');
        Route::patch('/{id}/estado', [CotizacionesController::class, 'cambiarEstado'])->middleware('permission:cotizaciones.edit');
    });

    // ============================================
    // COMPRAS
    // ============================================
    Route::prefix('compras')->middleware('permission:compras.ver')->group(function () {
        Route::get('/', [ComprasController::class, 'index']);
        Route::get('/estadisticas', [ComprasController::class, 'estadisticas']);
        Route::get('/estados/lista', [ComprasController::class, 'getEstados']);
        Route::get('/{id}', [ComprasController::class, 'show'])->middleware('permission:compras.show');
        Route::get('/{id}/tracking', [ComprasController::class, 'getTracking']);
        Route::get('/mis-compras', [ComprasController::class, 'misCompras']);

        Route::post('/', [ComprasController::class, 'store'])->middleware('permission:compras.create');
        Route::post('/{id}/cancelar', [ComprasController::class, 'cancelar'])->middleware('permission:compras.cancelar');
        Route::post('/{id}/aprobar', [ComprasController::class, 'aprobar'])->middleware('permission:compras.aprobar');
        Route::post('/{id}/rechazar', [ComprasController::class, 'rechazar'])->middleware('permission:compras.aprobar');
        Route::patch('/{id}/estado', [ComprasController::class, 'cambiarEstado'])->middleware('permission:compras.edit');
        Route::post('/{id}/procesar-pago', [ComprasController::class, 'procesarPago'])->middleware('permission:compras.edit');
    });

    // ============================================
    // CLIENTES
    // ============================================
    Route::middleware('permission:clientes.ver')->group(function () {
        Route::get('/clientes', [ClientesController::class, 'index']);
        Route::get('/clientes/estadisticas', [ClientesController::class, 'estadisticas']);
        Route::get('/clientes/buscar-por-documento', [ClientesController::class, 'buscarPorDocumento']);
    });

    Route::middleware('permission:clientes.show')->group(function () {
        Route::get('/clientes/{id}', [ClientesController::class, 'show']);
    });

    Route::middleware('permission:clientes.edit')->group(function () {
        Route::post('/clientes', [ClientesController::class, 'store']);
        Route::put('/clientes/{id}', [ClientesController::class, 'update']);
        Route::patch('/clientes/{id}/toggle-estado', [ClientesController::class, 'toggleEstado']);
    });

    Route::prefix('cliente')->group(function () {
        Route::post('/upload-foto', [ClientesController::class, 'uploadFoto']);
        Route::delete('/delete-foto', [ClientesController::class, 'deleteFoto']);
    });

    Route::middleware('permission:clientes.delete')->group(function () {
        Route::delete('/clientes/{id}', [ClientesController::class, 'destroy']);
    });

    // ============================================
    // MIS DIRECCIONES
    // ============================================
    Route::prefix('mis-direcciones')->group(function () {
        Route::get('/', [ClientesController::class, 'misDirecciones']);
        Route::post('/', [ClientesController::class, 'crearDireccion']);
        Route::put('/{id}', [ClientesController::class, 'actualizarDireccion']);
        Route::delete('/{id}', [ClientesController::class, 'eliminarDireccion']);
        Route::patch('/{id}/predeterminada', [ClientesController::class, 'establecerPredeterminada']);
    });

    // ============================================
    // MIS DOCUMENTOS (CLIENTE)
    // ============================================
    Route::prefix('cliente')->group(function () {
        Route::get('/mis-comprobantes', [MisDocumentosController::class, 'misComprobantes']);
        Route::get('/mis-comprobantes/{id}', [MisDocumentosController::class, 'verComprobante']);
        Route::get('/mis-comprobantes/{id}/pdf', [MisDocumentosController::class, 'descargarComprobantePDF'])->name('api.cliente.descargar-comprobante');
        Route::get('/mis-comprobantes/{id}/xml', [MisDocumentosController::class, 'descargarComprobanteXML']);
        Route::post('/mis-comprobantes/{id}/reenviar', [MisDocumentosController::class, 'reenviarComprobante']);
        Route::get('/mis-ventas', [MisDocumentosController::class, 'misVentas']);
        Route::get('/mis-cuentas', [MisDocumentosController::class, 'misCuentasPorCobrar']);
        Route::get('/estado-cuenta/pdf', [MisDocumentosController::class, 'descargarEstadoCuenta']);
    });
});
