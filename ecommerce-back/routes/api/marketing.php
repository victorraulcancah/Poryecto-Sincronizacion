<?php

use App\Http\Controllers\BannersController;
use App\Http\Controllers\BannersPromocionalesController;
use App\Http\Controllers\BannerFlashSalesController;
use App\Http\Controllers\BannerOfertaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Marketing
|--------------------------------------------------------------------------
|
| Gestión de banners, promociones y campañas de marketing
|
*/

Route::middleware('auth:sanctum')->group(function () {

    // ============================================
    // BANNERS
    // ============================================
    Route::middleware('permission:banners.ver')->group(function () {
        Route::get('/banners', [BannersController::class, 'index']);
        Route::get('/banners/{id}', [BannersController::class, 'show']);
    });

    Route::middleware('permission:banners.create')->group(function () {
        Route::post('/banners', [BannersController::class, 'store']);
    });

    Route::middleware('permission:banners.edit')->group(function () {
        Route::post('/banners/{id}', [BannersController::class, 'update']);
        Route::patch('/banners/{id}/toggle-estado', [BannersController::class, 'toggleEstado']);
    });

    Route::middleware('permission:banners.delete')->group(function () {
        Route::delete('/banners/{id}', [BannersController::class, 'destroy']);
    });

    Route::post('/banners/reordenar', [BannersController::class, 'reordenar']);

    // ============================================
    // BANNERS PROMOCIONALES
    // ============================================
    Route::middleware('permission:banners_promocionales.ver')->group(function () {
        Route::get('/banners-promocionales', [BannersPromocionalesController::class, 'index']);
        Route::get('/banners-promocionales/{id}', [BannersPromocionalesController::class, 'show']);
    });

    Route::middleware('permission:banners_promocionales.create')->group(function () {
        Route::post('/banners-promocionales', [BannersPromocionalesController::class, 'store']);
    });

    Route::middleware('permission:banners_promocionales.edit')->group(function () {
        Route::post('/banners-promocionales/{id}', [BannersPromocionalesController::class, 'update']);
        Route::patch('/banners-promocionales/{id}/toggle-estado', [BannersPromocionalesController::class, 'toggleEstado']);
    });

    Route::middleware('permission:banners_promocionales.delete')->group(function () {
        Route::delete('/banners-promocionales/{id}', [BannersPromocionalesController::class, 'destroy']);
    });

    // ============================================
    // BANNERS FLASH SALES
    // ============================================
    Route::middleware('permission:banners_flash_sales.ver')->group(function () {
        Route::get('/banners-flash-sales', [BannerFlashSalesController::class, 'index']);
        Route::get('/banners-flash-sales/{id}', [BannerFlashSalesController::class, 'show']);
    });

    Route::middleware('permission:banners_flash_sales.create')->group(function () {
        Route::post('/banners-flash-sales', [BannerFlashSalesController::class, 'store']);
    });

    Route::middleware('permission:banners_flash_sales.edit')->group(function () {
        Route::post('/banners-flash-sales/{id}', [BannerFlashSalesController::class, 'update']);
        Route::patch('/banners-flash-sales/{id}/toggle-activo', [BannerFlashSalesController::class, 'toggleActivo']);
    });

    Route::middleware('permission:banners_flash_sales.delete')->group(function () {
        Route::delete('/banners-flash-sales/{id}', [BannerFlashSalesController::class, 'destroy']);
    });

    // ============================================
    // BANNERS DE OFERTAS
    // ============================================
    Route::middleware('permission:banners_ofertas.ver')->group(function () {
        Route::get('/banners-ofertas', [BannerOfertaController::class, 'index']);
        Route::get('/banners-ofertas/{id}', [BannerOfertaController::class, 'show']);
        Route::get('/banners-ofertas/{bannerId}/productos', [BannerOfertaController::class, 'show']);
    });

    Route::middleware('permission:banners_ofertas.create')->group(function () {
        Route::post('/banners-ofertas', [BannerOfertaController::class, 'store']);
        Route::post('/banners-ofertas/{id}/productos', [BannerOfertaController::class, 'agregarProductos']);
    });

    Route::middleware('permission:banners_ofertas.edit')->group(function () {
        Route::post('/banners-ofertas/{id}', [BannerOfertaController::class, 'update']);
        Route::patch('/banners-ofertas/{bannerId}/productos/{productoId}', [BannerOfertaController::class, 'actualizarDescuentoProducto']);
    });

    Route::middleware('permission:banners_ofertas.delete')->group(function () {
        Route::delete('/banners-ofertas/{id}', [BannerOfertaController::class, 'destroy']);
        Route::delete('/banners-ofertas/{bannerId}/productos/{productoId}', [BannerOfertaController::class, 'quitarProducto']);
    });
});
