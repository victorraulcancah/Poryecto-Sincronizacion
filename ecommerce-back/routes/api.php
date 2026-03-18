<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Estructura Modular
|--------------------------------------------------------------------------
|
| Las rutas están organizadas en módulos por dominio de negocio.
| Cada módulo se encuentra en routes/api/{modulo}.php
|
| Estructura:
| - public.php: Rutas sin autenticación
| - admin.php: Administración y autenticación
| - facturacion.php: Facturación electrónica y SUNAT
| - contabilidad.php: Módulo contable
| - productos.php: Gestión de inventario
| - recompensas.php: Sistema de gamificación
| - ecommerce.php: Pedidos y carrito
| - marketing.php: Banners y promociones
|
*/

// Rutas públicas (sin autenticación)
require __DIR__.'/api/public.php';

// Rutas de administración y autenticación
require __DIR__.'/api/admin.php';

// Módulos de negocio (requieren autenticación)
require __DIR__.'/api/facturacion.php';
require __DIR__.'/api/contabilidad.php';
require __DIR__.'/api/productos.php';
require __DIR__.'/api/servicios.php';
require __DIR__.'/api/recompensas.php';
require __DIR__.'/api/ecommerce.php';
require __DIR__.'/api/marketing.php';

// CRUD de Tiendas
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/tiendas', [\App\Http\Controllers\TiendasController::class, 'index']);
    Route::post('/tiendas', [\App\Http\Controllers\TiendasController::class, 'store']);
    Route::get('/tiendas/{id}', [\App\Http\Controllers\TiendasController::class, 'show']);
    Route::put('/tiendas/{id}', [\App\Http\Controllers\TiendasController::class, 'update']);
    Route::delete('/tiendas/{id}', [\App\Http\Controllers\TiendasController::class, 'destroy']);
});

// Permisos del Usuario
Route::middleware(['auth:sanctum'])->prefix('user')->group(function () {
    Route::get('/permissions', [\App\Http\Controllers\UserPermissionsController::class, 'index']);
    Route::post('/permissions/check', [\App\Http\Controllers\UserPermissionsController::class, 'check']);
    Route::get('/permissions/available', [\App\Http\Controllers\UserPermissionsController::class, 'available']);
});

// Sincronización con 7Power
Route::middleware(['auth:sanctum'])->prefix('sincronizacion')->group(function () {
    Route::post('/7power', [\App\Http\Controllers\SincronizacionController::class, 'sincronizarDesde7Power']);
    Route::get('/estado', [\App\Http\Controllers\SincronizacionController::class, 'estadoSincronizacion']);
    Route::get('/diagnostico-stock', [\App\Http\Controllers\SincronizacionController::class, 'diagnosticoStock']);
});
