<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmpresaInfoController;
use App\Http\Controllers\HorariosController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserRegistrationController;
use App\Http\Controllers\UsuariosController;
use App\Http\Controllers\TipoPagoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Administración
|--------------------------------------------------------------------------
|
| Gestión de usuarios, roles, permisos, horarios y configuración del sistema
|
*/

Route::middleware('auth:sanctum')->group(function () {

    // ============================================
    // AUTENTICACIÓN Y SESIÓN
    // ============================================
    Route::get('/user', [AdminController::class, 'user']);
    Route::get('/refresh-permissions', [AdminController::class, 'refreshPermissions']);
    Route::post('/logout', [AdminController::class, 'logout']);

    // ============================================
    // DASHBOARD ESTADÍSTICAS
    // ============================================
    Route::prefix('dashboard')->group(function () {
        Route::get('/estadisticas', [DashboardController::class, 'estadisticasDashboard']);
        Route::get('/producto-del-mes', [DashboardController::class, 'productoDelMes']);
        Route::get('/categorias-vendidas', [DashboardController::class, 'categoriasVendidas']);
        Route::get('/pedidos-por-dia', [DashboardController::class, 'pedidosPorDia']);
        Route::get('/ventas-mensuales', [DashboardController::class, 'ventasMensuales']);
    });

    // ============================================
    // USUARIOS
    // ============================================
    Route::middleware('permission:usuarios.ver')->group(function () {
        Route::get('/usuarios', [UsuariosController::class, 'index']);
        Route::get('/usuarios/{id}', [UsuariosController::class, 'show'])->middleware('permission:usuarios.show');
        Route::put('/usuarios/{id}', [UsuariosController::class, 'update'])->middleware('permission:usuarios.edit');
        Route::patch('/usuarios/{id}/cambiar-estado', [UsuariosController::class, 'cambiarEstado'])->middleware('permission:usuarios.edit');
        Route::delete('/usuarios/{id}', [UsuariosController::class, 'destroy'])->middleware('permission:usuarios.delete');
        Route::post('/usuarios/register', [UserRegistrationController::class, 'store'])->middleware('permission:usuarios.create');
    });

    // ============================================
    // ROLES Y PERMISOS
    // ============================================
    Route::middleware('permission:roles.ver')->group(function () {
        Route::get('/permissions', [RoleController::class, 'getPermissions']);
        Route::get('/roles', [RoleController::class, 'getRoles']);
        Route::get('/roles/{id}/permissions', [RoleController::class, 'getRolePermissions']);

        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:roles.create');
        Route::put('/roles/{id}/permissions', [RoleController::class, 'updateRolePermissions'])->middleware('permission:roles.edit');
        Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');
    });

    // ============================================
    // HORARIOS
    // ============================================
    Route::middleware('permission:horarios.ver')->group(function () {
        Route::get('/horarios', [HorariosController::class, 'index']);
        Route::get('/horarios/plantillas', [HorariosController::class, 'plantillasHorarios']);
        Route::get('/horarios/{userId}/usuario', [HorariosController::class, 'show'])->middleware('permission:horarios.show');
    });

    Route::middleware('permission:horarios.create')->group(function () {
        Route::post('/horarios', [HorariosController::class, 'store']);
        Route::post('/horarios/copiar', [HorariosController::class, 'copiarHorarios']);
    });

    Route::middleware('permission:horarios.edit')->group(function () {
        Route::put('/horarios/{id}', [HorariosController::class, 'update']);
    });

    Route::middleware('permission:horarios.delete')->group(function () {
        Route::delete('/horarios/{id}', [HorariosController::class, 'destroy']);
        Route::post('/horarios/eliminar-usuario', [HorariosController::class, 'eliminarHorariosUsuario']);
    });

    // ============================================
    // INFORMACIÓN DE EMPRESA
    // ============================================
    Route::middleware('permission:empresa_info.ver')->group(function () {
        Route::get('/empresa-info/{id}', [EmpresaInfoController::class, 'show']);
        Route::get('/empresa-info', [EmpresaInfoController::class, 'index']);
    });

    Route::middleware('permission:empresa_info.edit')->group(function () {
        Route::post('/empresa-info', [EmpresaInfoController::class, 'store']);
        Route::put('/empresa-info/{id}', [EmpresaInfoController::class, 'update']);
    });

    // ============================================
    // PASOS DE ENVÍO (ADMIN)
    // ============================================
    Route::middleware('permission:pasos_envio.edit')->group(function () {
        Route::get('/admin/pasos-envio', [\App\Http\Controllers\PasoEnvioController::class, 'indexAdmin']);
        Route::post('/admin/pasos-envio', [\App\Http\Controllers\PasoEnvioController::class, 'store']);
        Route::get('/admin/pasos-envio/{id}', [\App\Http\Controllers\PasoEnvioController::class, 'show']);
        Route::post('/admin/pasos-envio/{id}', [\App\Http\Controllers\PasoEnvioController::class, 'update']);
        Route::delete('/admin/pasos-envio/{id}', [\App\Http\Controllers\PasoEnvioController::class, 'destroy']);
        Route::delete('/admin/pasos-envio/{id}/imagen', [\App\Http\Controllers\PasoEnvioController::class, 'deleteImage']);
    });
      // Rutas de Tipos de Pago protegidas con permisos
    Route::middleware('permission:configuracion.ver')->group(function () {
        Route::get('/tipos-pago', [TipoPagoController::class, 'index']);
    });

    Route::middleware('permission:configuracion.create')->group(function () {
        Route::post('/tipos-pago', [TipoPagoController::class, 'store']);
    });

    Route::middleware('permission:configuracion.edit')->group(function () {
        Route::put('/tipos-pago/{id}', [TipoPagoController::class, 'update']);
        Route::patch('/tipos-pago/{id}/toggle-estado', [TipoPagoController::class, 'toggleEstado']);
    });

    Route::middleware('permission:configuracion.delete')->group(function () {
        Route::delete('/tipos-pago/{id}', [TipoPagoController::class, 'destroy']);
    });

    // ============================================
    // MENÚS (ADMIN)
    // ============================================
    Route::middleware('permission:configuracion.ver')->group(function () {
        Route::get('/menus', [\App\Http\Controllers\MenuController::class, 'index']);
        Route::get('/menus/para-select', [\App\Http\Controllers\MenuController::class, 'menusParaSelect']);
        Route::get('/menus/{id}', [\App\Http\Controllers\MenuController::class, 'show']);
    });

    Route::middleware('permission:configuracion.create')->group(function () {
        Route::post('/menus', [\App\Http\Controllers\MenuController::class, 'store']);
    });

    Route::middleware('permission:configuracion.edit')->group(function () {
        Route::put('/menus/{id}', [\App\Http\Controllers\MenuController::class, 'update']);
        Route::post('/menus/{id}/toggle-visibilidad', [\App\Http\Controllers\MenuController::class, 'toggleVisibilidad']);
        Route::patch('/menus/{id}/toggle-visible', [\App\Http\Controllers\MenuController::class, 'toggleVisible']);
        Route::post('/menus/reordenar', [\App\Http\Controllers\MenuController::class, 'reordenar']);
    });

    Route::middleware('permission:configuracion.delete')->group(function () {
        Route::delete('/menus/{id}', [\App\Http\Controllers\MenuController::class, 'destroy']);
    });

    // ============================================
    // CONFIGURACIÓN DE COOKIES (ADMIN)
    // ============================================
    Route::middleware('permission:configuracion.ver')->group(function () {
        Route::get('/cookies/configuracion', [\App\Http\Controllers\CookieConfiguracionController::class, 'index']);
    });

    Route::middleware('permission:configuracion.edit')->group(function () {
        Route::put('/cookies/configuracion', [\App\Http\Controllers\CookieConfiguracionController::class, 'update']);
    });
});
