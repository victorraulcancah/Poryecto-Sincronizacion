<?php

use App\Http\Controllers\CategoriasController;
use App\Http\Controllers\CuponesController;
use App\Http\Controllers\MarcaProductoController;
use App\Http\Controllers\OfertasController;
use App\Http\Controllers\ProductoDetallesController;
use App\Http\Controllers\ProductosController;
use App\Http\Controllers\SeccionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Productos y Almacén
|--------------------------------------------------------------------------
|
| Gestión de inventario, productos, categorías, marcas y ofertas
|
*/

Route::middleware('auth:sanctum')->group(function () {

    // ============================================
    // PRODUCTOS
    // ============================================
    Route::middleware('permission:productos.ver')->group(function () {
        Route::get('/productos', [ProductosController::class, 'index']);
        Route::get('/productos/stock/bajo', [ProductosController::class, 'stockBajo']);
        Route::get('/productos/estadisticas', [ProductosController::class, 'estadisticasDashboard']);
        Route::get('/productos/stock-critico', [ProductosController::class, 'productosStockCritico']);
        Route::get('/productos/{id}', [ProductosController::class, 'show']);
        Route::get('/productos/{id}/detalles', [ProductoDetallesController::class, 'show']);
    });

    Route::middleware('permission:productos.create')->group(function () {
        Route::post('/productos', [ProductosController::class, 'store']);
    });

    Route::middleware('permission:productos.edit')->group(function () {
        Route::put('/productos/{id}', [ProductosController::class, 'update']);
        Route::patch('/productos/{id}/toggle-estado', [ProductosController::class, 'toggleEstado']);
        Route::patch('/productos/{id}/toggle-destacado', [ProductosController::class, 'toggleDestacado']);

        Route::post('/productos/{id}/detalles', [ProductoDetallesController::class, 'store']);
        Route::post('/productos/{id}/detalles/imagenes', [ProductoDetallesController::class, 'agregarImagenes']);
        Route::delete('/productos/{id}/detalles/imagenes', [ProductoDetallesController::class, 'eliminarImagen']);
    });

    Route::middleware('permission:productos.delete')->group(function () {
        Route::delete('/productos/{id}', [ProductosController::class, 'destroy']);
    });

    // ============================================
    // CATEGORÍAS
    // ============================================
    Route::middleware('permission:categorias.ver')->group(function () {
        Route::get('/categorias', [CategoriasController::class, 'index']);
        Route::get('/categorias/{id}', [CategoriasController::class, 'show']);
        Route::get('/arma-pc/configuracion', [CategoriasController::class, 'configuracionArmaPc']);
    });

    Route::middleware('permission:categorias.create')->group(function () {
        Route::post('/categorias', [CategoriasController::class, 'store']);
    });

    Route::middleware('permission:categorias.edit')->group(function () {
        Route::put('/categorias/{id}', [CategoriasController::class, 'update']);
        Route::patch('/categorias/{id}/toggle-estado', [CategoriasController::class, 'toggleEstado']);
        Route::patch('/categorias/{id}/migrar-seccion', [SeccionController::class, 'migrarCategoria']);
        Route::post('/arma-pc/configuracion', [CategoriasController::class, 'guardarConfiguracionArmaPc']);
        Route::put('/arma-pc/configuracion/orden', [CategoriasController::class, 'actualizarOrdenArmaPc']);
        Route::get('/arma-pc/compatibilidades', [CategoriasController::class, 'obtenerCompatibilidades']);
        Route::post('/arma-pc/compatibilidades', [CategoriasController::class, 'gestionarCompatibilidades']);
    });

    Route::middleware('permission:categorias.delete')->group(function () {
        Route::delete('/categorias/{id}', [CategoriasController::class, 'destroy']);
    });

    // ============================================
    // MARCAS
    // ============================================
    Route::middleware('permission:marcas.ver')->group(function () {
        Route::get('/marcas', [MarcaProductoController::class, 'index']);
        Route::get('/marcas/activas', [MarcaProductoController::class, 'marcasActivas']);
        Route::get('/marcas/{id}', [MarcaProductoController::class, 'show']);
    });

    Route::middleware('permission:marcas.create')->group(function () {
        Route::post('/marcas', [MarcaProductoController::class, 'store']);
    });

    Route::middleware('permission:marcas.edit')->group(function () {
        Route::put('/marcas/{id}', [MarcaProductoController::class, 'update']);
        Route::patch('/marcas/{id}/toggle-estado', [MarcaProductoController::class, 'toggleEstado']);
    });

    Route::middleware('permission:marcas.delete')->group(function () {
        Route::delete('/marcas/{id}', [MarcaProductoController::class, 'destroy']);
    });

    // ============================================
    // SECCIONES
    // ============================================
    Route::middleware('permission:secciones.ver')->group(function () {
        Route::get('/secciones', [SeccionController::class, 'index']);
        Route::get('/secciones/{id}', [SeccionController::class, 'show']);
    });

    Route::middleware('permission:secciones.create')->group(function () {
        Route::post('/secciones', [SeccionController::class, 'store']);
    });

    Route::middleware('permission:secciones.edit')->group(function () {
        Route::put('/secciones/{id}', [SeccionController::class, 'update']);
    });

    Route::middleware('permission:secciones.delete')->group(function () {
        Route::delete('/secciones/{id}', [SeccionController::class, 'destroy']);
    });

    // ============================================
    // OFERTAS
    // ============================================
    Route::middleware('permission:ofertas.ver')->group(function () {
        Route::resource('ofertas', OfertasController::class);
        Route::get('/tipos-ofertas', [OfertasController::class, 'tiposOfertas']);
        Route::get('/productos-disponibles', [OfertasController::class, 'productosDisponibles']);
        Route::get('/ofertas/{oferta}/productos', [OfertasController::class, 'productosOferta']);
        Route::post('/ofertas/{oferta}/productos', [OfertasController::class, 'agregarProducto']);
        Route::put('/ofertas/{oferta}/productos/{productoOferta}', [OfertasController::class, 'actualizarProducto']);
        Route::delete('/ofertas/{oferta}/productos/{productoOferta}', [OfertasController::class, 'eliminarProducto']);
        Route::patch('/ofertas/{id}/toggle-principal', [OfertasController::class, 'toggleOfertaPrincipal']);
        Route::patch('/ofertas/{id}/toggle-semana', [OfertasController::class, 'toggleOfertaSemana']);
    });

    // ============================================
    // CUPONES
    // ============================================
    Route::middleware('permission:cupones.ver')->group(function () {
        Route::resource('cupones', CuponesController::class);
    });

    // ============================================
    // SINCRONIZACIÓN CON 7POWER
    // ============================================
    Route::prefix('sincronizacion-7power')->group(function () {
        Route::post('/productos', [\App\Http\Controllers\Sincronizacion7PowerController::class, 'sincronizarProductos']);
        Route::get('/estadisticas', [\App\Http\Controllers\Sincronizacion7PowerController::class, 'estadisticasSincronizacion']);
    });

    // ============================================
    // PROXY PARA PRODUCTOS DE 7POWER
    // ============================================
    Route::prefix('productos-7power')->group(function () {
        Route::post('/{id}', [\App\Http\Controllers\Productos7PowerController::class, 'update']);
        Route::post('/{id}/imagen', [\App\Http\Controllers\Productos7PowerController::class, 'uploadImage']);
    });

    // ============================================
    // IMÁGENES DE PRODUCTOS 7POWER (guardadas en Magus)
    // ============================================
    Route::prefix('productos-7power-imagenes')->group(function () {
        Route::get('/batch', [\App\Http\Controllers\ProductoImagenes7PowerController::class, 'getBatchImages']); // ✅ Debe ir primero
        Route::post('/{producto7powerId}', [\App\Http\Controllers\ProductoImagenes7PowerController::class, 'uploadImage']);
        Route::get('/{producto7powerId}', [\App\Http\Controllers\ProductoImagenes7PowerController::class, 'getImage']);
        Route::delete('/{producto7powerId}', [\App\Http\Controllers\ProductoImagenes7PowerController::class, 'deleteImage']);
        Route::get('/', [\App\Http\Controllers\ProductoImagenes7PowerController::class, 'getAllImages']);
    });
});

// ============================================
// ENDPOINTS PÚBLICOS (sin autenticación)
// ============================================

// Endpoint público para que 7Power consulte imágenes
Route::get('/public/productos-7power-imagenes/batch', [\App\Http\Controllers\ProductoImagenes7PowerController::class, 'getBatchImages']);
