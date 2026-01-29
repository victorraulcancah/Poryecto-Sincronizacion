<?php

use App\Http\Controllers\ServiciosController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas de Servicios
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:api'])->group(function () {

    // CRUD de Servicios
    Route::prefix('servicios')->group(function () {
        Route::get('/', [ServiciosController::class, 'index']);
        Route::post('/', [ServiciosController::class, 'store']);
        Route::get('/{id}', [ServiciosController::class, 'show']);
        Route::put('/{id}', [ServiciosController::class, 'update']);
        Route::delete('/{id}', [ServiciosController::class, 'destroy']);
    });
});
