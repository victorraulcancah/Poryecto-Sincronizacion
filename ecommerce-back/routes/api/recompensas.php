<?php

use App\Http\Controllers\Recompensas\RecompensaAnalyticsController;
use App\Http\Controllers\Recompensas\RecompensaClienteController;
use App\Http\Controllers\Recompensas\RecompensaController;
use App\Http\Controllers\Recompensas\RecompensaDescuentosController;
use App\Http\Controllers\Recompensas\RecompensaEnviosController;
use App\Http\Controllers\Recompensas\RecompensaEstadisticaController;
use App\Http\Controllers\Recompensas\RecompensaNotificacionController;
use App\Http\Controllers\Recompensas\RecompensaPopupController;
use App\Http\Controllers\Recompensas\RecompensaProductoController;
use App\Http\Controllers\Recompensas\RecompensaPuntosController;
use App\Http\Controllers\Recompensas\RecompensaRegalosController;
use App\Http\Controllers\Recompensas\RecompensaSegmentoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Recompensas
|--------------------------------------------------------------------------
|
| Sistema de gamificación, puntos, regalos y beneficios para clientes
|
*/

Route::middleware('auth:sanctum')->group(function () {

    // ============================================
    // ADMINISTRACIÓN DE RECOMPENSAS
    // ============================================
    Route::prefix('admin/recompensas')->middleware('permission:recompensas.ver')->group(function () {

        // Gestión principal
        Route::get('/', [RecompensaController::class, 'index']);
        Route::get('/popups', [RecompensaController::class, 'indexPopups']);
        Route::get('/estadisticas', [RecompensaEstadisticaController::class, 'estadisticas']);
        Route::get('/tipos', [RecompensaEstadisticaController::class, 'tipos']);
        Route::get('/estados-disponibles', [RecompensaController::class, 'estadosDisponibles']);
        Route::get('/{id}', [RecompensaController::class, 'show'])->middleware('permission:recompensas.show');

        // Analytics Avanzados
        Route::prefix('analytics')->middleware('permission:recompensas.analytics')->group(function () {
            Route::get('/dashboard', [RecompensaAnalyticsController::class, 'dashboard']);
            Route::get('/tendencias', [RecompensaAnalyticsController::class, 'tendencias']);
            Route::get('/rendimiento', [RecompensaAnalyticsController::class, 'rendimiento']);
            Route::get('/comparativa', [RecompensaAnalyticsController::class, 'comparativa']);
            Route::get('/comportamiento-clientes', [RecompensaAnalyticsController::class, 'comportamientoClientes']);
        });

        // Creación y edición
        Route::post('/', [RecompensaController::class, 'store'])->middleware('permission:recompensas.create');
        Route::put('/{id}', [RecompensaController::class, 'update'])->middleware('permission:recompensas.edit');
        Route::patch('/{id}/pause', [RecompensaController::class, 'pause'])->middleware('permission:recompensas.edit');
        Route::patch('/{id}/activate', [RecompensaController::class, 'activate'])->middleware('permission:recompensas.activate');
        Route::delete('/{id}', [RecompensaController::class, 'destroy'])->middleware('permission:recompensas.delete');

        // Gestión de segmentos y clientes
        Route::prefix('{recompensaId}/segmentos')->middleware('permission:recompensas.segmentos')->group(function () {
            Route::get('/', [RecompensaSegmentoController::class, 'index']);
            Route::post('/', [RecompensaSegmentoController::class, 'store']);
            Route::delete('/{segmentoId}', [RecompensaSegmentoController::class, 'destroy']);
            Route::get('/disponibles', [RecompensaSegmentoController::class, 'segmentosDisponibles']);
            Route::get('/estadisticas', [RecompensaSegmentoController::class, 'estadisticasSegmentacion']);
            Route::post('/validar-cliente', [RecompensaSegmentoController::class, 'validarCliente']);
        });

        Route::get('/clientes/buscar', [RecompensaSegmentoController::class, 'buscarClientes'])->middleware('permission:recompensas.segmentos');

        // Gestión de productos y categorías
        Route::prefix('{recompensaId}/productos')->middleware('permission:recompensas.productos')->group(function () {
            Route::get('/', [RecompensaProductoController::class, 'index']);
            Route::post('/', [RecompensaProductoController::class, 'store']);
            Route::delete('/{asignacionId}', [RecompensaProductoController::class, 'destroy']);
            Route::get('/aplicables', [RecompensaProductoController::class, 'productosAplicables']);
            Route::get('/estadisticas', [RecompensaProductoController::class, 'estadisticas']);
            Route::post('/validar-producto', [RecompensaProductoController::class, 'validarProducto']);
        });

        Route::get('/productos/buscar', [RecompensaProductoController::class, 'buscarProductos'])->middleware('permission:recompensas.productos');
        Route::get('/categorias/buscar', [RecompensaProductoController::class, 'buscarCategorias'])->middleware('permission:recompensas.productos');

        // Submódulo de Puntos
        Route::prefix('{recompensaId}/puntos')->middleware('permission:recompensas.puntos')->group(function () {
            Route::get('/', [RecompensaPuntosController::class, 'index']);
            Route::post('/', [RecompensaPuntosController::class, 'store']);
            Route::put('/{configId}', [RecompensaPuntosController::class, 'update']);
            Route::delete('/{configId}', [RecompensaPuntosController::class, 'destroy']);
            Route::post('/simular', [RecompensaPuntosController::class, 'simular']);
        });

        Route::get('/puntos/ejemplos', [RecompensaPuntosController::class, 'ejemplos'])->middleware('permission:recompensas.puntos');
        Route::post('/puntos/validar', [RecompensaPuntosController::class, 'validar'])->middleware('permission:recompensas.puntos');

        // Submódulo de Descuentos
        Route::prefix('{recompensaId}/descuentos')->middleware('permission:recompensas.descuentos')->group(function () {
            Route::get('/', [RecompensaDescuentosController::class, 'index']);
            Route::post('/', [RecompensaDescuentosController::class, 'store']);
            Route::put('/{configId}', [RecompensaDescuentosController::class, 'update']);
            Route::delete('/{configId}', [RecompensaDescuentosController::class, 'destroy']);
            Route::post('/simular', [RecompensaDescuentosController::class, 'simular']);
            Route::post('/calcular', [RecompensaDescuentosController::class, 'calcular']);
        });

        Route::get('/descuentos/tipos', [RecompensaDescuentosController::class, 'tiposDisponibles'])->middleware('permission:recompensas.descuentos');
        Route::post('/descuentos/validar', [RecompensaDescuentosController::class, 'validar'])->middleware('permission:recompensas.descuentos');

        // Submódulo de Envíos
        Route::prefix('{recompensaId}/envios')->middleware('permission:recompensas.envios')->group(function () {
            Route::get('/', [RecompensaEnviosController::class, 'index']);
            Route::post('/', [RecompensaEnviosController::class, 'store']);
            Route::put('/{configId}', [RecompensaEnviosController::class, 'update']);
            Route::delete('/{configId}', [RecompensaEnviosController::class, 'destroy']);
            Route::post('/validar', [RecompensaEnviosController::class, 'validar']);
            Route::get('/estadisticas-cobertura', [RecompensaEnviosController::class, 'estadisticasCobertura']);
        });

        Route::get('/envios/zonas/buscar', [RecompensaEnviosController::class, 'buscarZonas'])->middleware('permission:recompensas.envios');
        Route::get('/envios/departamentos', [RecompensaEnviosController::class, 'departamentos'])->middleware('permission:recompensas.envios');

        // Submódulo de Regalos
        Route::prefix('{recompensaId}/regalos')->middleware('permission:recompensas.regalos')->group(function () {
            Route::get('/', [RecompensaRegalosController::class, 'index']);
            Route::post('/', [RecompensaRegalosController::class, 'store']);
            Route::put('/{configId}', [RecompensaRegalosController::class, 'update']);
            Route::delete('/{configId}', [RecompensaRegalosController::class, 'destroy']);
            Route::post('/{configId}/verificar-disponibilidad', [RecompensaRegalosController::class, 'verificarDisponibilidad']);
            Route::post('/simular', [RecompensaRegalosController::class, 'simular']);
            Route::get('/estadisticas', [RecompensaRegalosController::class, 'estadisticas']);
        });

        Route::get('/regalos/productos/buscar', [RecompensaRegalosController::class, 'buscarProductos'])->middleware('permission:recompensas.regalos');

        // Submódulo de Popups
        Route::prefix('{recompensaId}/popups')->middleware('permission:recompensas.popups')->group(function () {
            Route::get('/', [RecompensaPopupController::class, 'index']);
            Route::get('/{popupId}', [RecompensaPopupController::class, 'show']);
            Route::post('/', [RecompensaPopupController::class, 'store']);
            Route::put('/{popupId}', [RecompensaPopupController::class, 'update']);
            Route::delete('/{popupId}', [RecompensaPopupController::class, 'destroy']);
            Route::patch('/{popupId}/toggle', [RecompensaPopupController::class, 'toggleActivo']);
            Route::get('/estadisticas-popups', [RecompensaPopupController::class, 'estadisticas']);
        });

        // Gestión de Notificaciones
        Route::prefix('{recompensaId}/notificaciones')->middleware('permission:recompensas.notificaciones')->group(function () {
            Route::post('/enviar', [RecompensaNotificacionController::class, 'enviarNotificacion']);
            Route::get('/estadisticas', [RecompensaNotificacionController::class, 'estadisticasNotificaciones']);
        });
    });

    // ============================================
    // CLIENTE - CONSULTA DE RECOMPENSAS
    // ============================================
    Route::prefix('cliente/recompensas')->group(function () {
        Route::get('/activas', [RecompensaClienteController::class, 'recompensasActivas']);
        Route::get('/{id}/detalle', [RecompensaClienteController::class, 'detalleRecompensa']);
        Route::get('/historial', [RecompensaClienteController::class, 'historialRecompensas']);
        Route::get('/puntos', [RecompensaClienteController::class, 'puntosAcumulados']);
        Route::get('/popups-activos', [RecompensaNotificacionController::class, 'popupsActivos'])->withoutMiddleware(['auth:sanctum']);
        Route::get('/popups-probar-envio', [RecompensaNotificacionController::class, 'probarEnvioAutomatico']);
        Route::patch('/popups/{popupId}/marcar-visto', [RecompensaNotificacionController::class, 'marcarVisto'])->withoutMiddleware(['auth:sanctum']);
        Route::patch('/popups/{popupId}/cerrar', [RecompensaNotificacionController::class, 'cerrarPopup'])->withoutMiddleware(['auth:sanctum']);
        Route::get('/notificaciones/historial', [RecompensaNotificacionController::class, 'historialNotificaciones']);
        Route::get('/popups-diagnostico', [RecompensaNotificacionController::class, 'diagnosticarPopups'])->withoutMiddleware(['auth:sanctum']);
    });
});

// ============================================
// ENDPOINT DE DIAGNÓSTICO
// ============================================
Route::get('/popups/diagnostico', [RecompensaNotificacionController::class, 'diagnosticarPopups'])
    ->name('popups.diagnostico');
