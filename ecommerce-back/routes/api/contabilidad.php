<?php

use App\Http\Controllers\Contabilidad\CajaChicaController;
use App\Http\Controllers\Contabilidad\CajasController;
use App\Http\Controllers\Contabilidad\CuentasPorCobrarController;
use App\Http\Controllers\Contabilidad\CuentasPorPagarController;
use App\Http\Controllers\Contabilidad\ExportacionesController;
use App\Http\Controllers\Contabilidad\FlujoCajaController;
use App\Http\Controllers\Contabilidad\KardexController;
use App\Http\Controllers\Contabilidad\ProveedoresController;
use App\Http\Controllers\Contabilidad\ReportesContablesController;
use App\Http\Controllers\Contabilidad\UtilidadesController;
use App\Http\Controllers\Contabilidad\VouchersController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Contabilidad
|--------------------------------------------------------------------------
|
| Sistema de gestión contable, cajas, cuentas y reportes financieros
|
*/

Route::middleware(['auth:sanctum'])->prefix('contabilidad')->group(function () {

    // ============================================
    // CAJAS - Control de efectivo diario
    // ============================================
    Route::middleware('permission:contabilidad.cajas.ver')->group(function () {
        Route::get('/cajas', [CajasController::class, 'index']);
        Route::get('/cajas/abiertas', [CajasController::class, 'abiertas']);
        Route::get('/cajas/{id}', [CajasController::class, 'show']);
        Route::get('/cajas/{id}/estado', [CajasController::class, 'estado']);
        Route::get('/cajas/{id}/transacciones', [CajasController::class, 'getTransacciones']);
        Route::get('/cajas/{id}/reporte', [CajasController::class, 'reporte']);
    });

    Route::middleware('permission:contabilidad.cajas.crear')->group(function () {
        Route::post('/cajas', [CajasController::class, 'store']);
        Route::post('/cajas/{id}/aperturar', [CajasController::class, 'aperturar']);
        Route::post('/cajas/{id}/transacciones', [CajasController::class, 'storeTransaccion']);
    });

    Route::middleware('permission:contabilidad.cajas.editar')->group(function () {
        Route::put('/cajas/{id}', [CajasController::class, 'update']);
        Route::post('/cajas/{id}/cerrar', [CajasController::class, 'cerrar']);
    });

    Route::middleware('permission:contabilidad.cajas.eliminar')->group(function () {
        Route::delete('/cajas/{id}/transacciones/{txId}', [CajasController::class, 'deleteTransaccion']);
    });

    // ============================================
    // CAJA CHICA - Gastos menores
    // ============================================
    Route::middleware('permission:contabilidad.caja_chica.ver')->group(function () {
        Route::get('/caja-chica', [CajaChicaController::class, 'index']);
        Route::get('/caja-chica/{id}', [CajaChicaController::class, 'show']);
        Route::get('/caja-chica/{id}/saldo', [CajaChicaController::class, 'saldo']);
        Route::get('/caja-chica/{id}/gastos', [CajaChicaController::class, 'getGastos']);
        Route::get('/caja-chica/gastos-pendientes', [CajaChicaController::class, 'gastosPendientes']);
        Route::get('/caja-chica/{id}/rendicion', [CajaChicaController::class, 'rendicion']);
    });

    Route::middleware('permission:contabilidad.caja_chica.crear')->group(function () {
        Route::post('/caja-chica', [CajaChicaController::class, 'store']);
        Route::post('/caja-chica/{id}/gastos', [CajaChicaController::class, 'storeGasto']);
    });

    Route::middleware('permission:contabilidad.caja_chica.editar')->group(function () {
        Route::put('/caja-chica/gastos/{gastoId}', [CajaChicaController::class, 'updateGasto']);
        Route::post('/caja-chica/gastos/{gastoId}/aprobar', [CajaChicaController::class, 'aprobarGasto']);
        Route::post('/caja-chica/{id}/reposicion', [CajaChicaController::class, 'reposicion']);
    });

    // ============================================
    // FLUJO DE CAJA - Proyecciones
    // ============================================
    Route::middleware('permission:contabilidad.flujo_caja.ver')->group(function () {
        Route::get('/flujo-caja', [FlujoCajaController::class, 'index']);
        Route::get('/flujo-caja/comparativa', [FlujoCajaController::class, 'comparativa']);
        Route::get('/flujo-caja/alertas', [FlujoCajaController::class, 'alertas']);
        Route::get('/flujo-caja/{id}', [FlujoCajaController::class, 'show']);
    });

    Route::middleware('permission:contabilidad.flujo_caja.crear')->group(function () {
        Route::post('/flujo-caja', [FlujoCajaController::class, 'store']);
    });

    Route::middleware('permission:contabilidad.flujo_caja.editar')->group(function () {
        Route::put('/flujo-caja/{id}', [FlujoCajaController::class, 'update']);
        Route::post('/flujo-caja/{id}/real', [FlujoCajaController::class, 'registrarReal']);
    });

    Route::middleware('permission:contabilidad.flujo_caja.eliminar')->group(function () {
        Route::delete('/flujo-caja/{id}', [FlujoCajaController::class, 'destroy']);
    });

    // ============================================
    // KARDEX - Control de inventario
    // ============================================
    Route::middleware('permission:contabilidad.kardex.ver')->group(function () {
        Route::get('/kardex/producto/{productoId}', [KardexController::class, 'show']);
        Route::get('/kardex/inventario-valorizado', [KardexController::class, 'inventarioValorizado']);
    });

    Route::middleware('permission:contabilidad.kardex.ajustar')->group(function () {
        Route::post('/kardex/ajuste', [KardexController::class, 'ajuste']);
    });

    // ============================================
    // CUENTAS POR COBRAR - Créditos a clientes
    // ============================================
    Route::middleware('permission:contabilidad.cuentas-cobrar.ver')->group(function () {
        Route::get('/cuentas-por-cobrar', [CuentasPorCobrarController::class, 'index']);
        Route::get('/cuentas-por-cobrar/{id}', [CuentasPorCobrarController::class, 'show']);
        Route::get('/cuentas-por-cobrar/antiguedad-saldos', [CuentasPorCobrarController::class, 'antiguedadSaldos']);
        Route::get('/cuentas-por-cobrar/{cuentaId}/pagos', [CuentasPorCobrarController::class, 'getPagos']);
    });

    Route::middleware('permission:contabilidad.cuentas-cobrar.crear')->group(function () {
        Route::post('/cuentas-por-cobrar', [CuentasPorCobrarController::class, 'store']);
    });

    Route::middleware('permission:contabilidad.cuentas-cobrar.pagar')->group(function () {
        Route::post('/cuentas-por-cobrar/{id}/pago', [CuentasPorCobrarController::class, 'registrarPago']);
    });

    // ============================================
    // CUENTAS POR PAGAR - Deudas con proveedores
    // ============================================
    Route::middleware('permission:contabilidad.cuentas-pagar.ver')->group(function () {
        Route::get('/cuentas-por-pagar', [CuentasPorPagarController::class, 'index']);
        Route::get('/cuentas-por-pagar/{id}', [CuentasPorPagarController::class, 'show']);
        Route::get('/cuentas-por-pagar/antiguedad-saldos', [CuentasPorPagarController::class, 'antiguedadSaldos']);
        Route::get('/cuentas-por-pagar/{id}/pagos', [CuentasPorPagarController::class, 'getPagos']);
        Route::get('/cuentas-por-pagar/estadisticas', [CuentasPorPagarController::class, 'estadisticas']);
    });

    Route::middleware('permission:contabilidad.cuentas-pagar.crear')->group(function () {
        Route::post('/cuentas-por-pagar', [CuentasPorPagarController::class, 'store']);
    });

    Route::middleware('permission:contabilidad.cuentas-pagar.editar')->group(function () {
        Route::put('/cuentas-por-pagar/{id}', [CuentasPorPagarController::class, 'update']);
    });

    Route::middleware('permission:contabilidad.cuentas-pagar.eliminar')->group(function () {
        Route::delete('/cuentas-por-pagar/{id}', [CuentasPorPagarController::class, 'destroy']);
    });

    Route::middleware('permission:contabilidad.cuentas-pagar.pagar')->group(function () {
        Route::post('/cuentas-por-pagar/{id}/pago', [CuentasPorPagarController::class, 'registrarPago']);
    });

    // ============================================
    // PROVEEDORES
    // ============================================
    Route::middleware('permission:contabilidad.proveedores.ver')->group(function () {
        Route::get('/proveedores', [ProveedoresController::class, 'index']);
        Route::get('/proveedores/{id}', [ProveedoresController::class, 'show']);
    });

    Route::middleware('permission:contabilidad.proveedores.crear')->group(function () {
        Route::post('/proveedores', [ProveedoresController::class, 'store']);
    });

    Route::middleware('permission:contabilidad.proveedores.editar')->group(function () {
        Route::put('/proveedores/{id}', [ProveedoresController::class, 'update']);
    });

    // ============================================
    // REPORTES CONTABLES
    // ============================================
    Route::middleware('permission:contabilidad.reportes.ver')->group(function () {
        Route::get('/reportes/ventas-diarias', [ReportesContablesController::class, 'ventasDiarias']);
        Route::get('/reportes/ventas-mensuales', [ReportesContablesController::class, 'ventasMensuales']);
        Route::get('/reportes/productos-mas-vendidos', [ReportesContablesController::class, 'productosMasVendidos']);
        Route::get('/reportes/rentabilidad-productos', [ReportesContablesController::class, 'rentabilidadProductos']);
        Route::get('/reportes/dashboard-financiero', [ReportesContablesController::class, 'dashboardFinanciero']);
    });

    // ============================================
    // UTILIDADES Y RENTABILIDAD
    // ============================================
    Route::middleware('permission:contabilidad.utilidades.ver')->group(function () {
        Route::get('/utilidades/venta/{ventaId}', [UtilidadesController::class, 'calcularUtilidadVenta']);
        Route::get('/utilidades/reporte', [UtilidadesController::class, 'reporteUtilidades']);
        Route::get('/utilidades/por-producto', [UtilidadesController::class, 'utilidadPorProducto']);
        Route::get('/utilidades/gastos', [UtilidadesController::class, 'listarGastos']);
        Route::get('/utilidades/gastos/por-categoria', [UtilidadesController::class, 'gastosPorCategoria']);
        Route::get('/utilidades/comparativa/{anio}', [UtilidadesController::class, 'comparativaMensual']);
        Route::get('/utilidades/punto-equilibrio', [UtilidadesController::class, 'puntoEquilibrio']);
    });

    Route::middleware('permission:contabilidad.utilidades.crear')->group(function () {
        Route::post('/utilidades/gastos', [UtilidadesController::class, 'registrarGasto']);
    });

    Route::middleware('permission:contabilidad.utilidades.editar')->group(function () {
        Route::post('/utilidades/mensual/{mes}/{anio}', [UtilidadesController::class, 'calcularUtilidadMensual']);
    });

    // ============================================
    // EXPORTACIONES - PDF y Excel
    // ============================================
    Route::middleware('permission:contabilidad.reportes.ver')->group(function () {
        Route::get('/exportar/caja/{id}/pdf', [ExportacionesController::class, 'exportarCajaPDF']);
        Route::get('/exportar/caja/{id}/excel', [ExportacionesController::class, 'exportarCajaExcel']);
        Route::get('/exportar/kardex/{productoId}/pdf', [ExportacionesController::class, 'exportarKardexPDF']);
        Route::get('/exportar/kardex/{productoId}/excel', [ExportacionesController::class, 'exportarKardexExcel']);
        Route::get('/exportar/cxc/pdf', [ExportacionesController::class, 'exportarCxCPDF']);
        Route::get('/exportar/cxc/excel', [ExportacionesController::class, 'exportarCxCExcel']);
        Route::get('/exportar/utilidades/pdf', [ExportacionesController::class, 'exportarUtilidadesPDF']);
        Route::get('/exportar/utilidades/excel', [ExportacionesController::class, 'exportarUtilidadesExcel']);
        Route::post('/exportar/ple/registro-ventas', [ExportacionesController::class, 'exportarRegistroVentasTXT']);
        Route::post('/exportar/ple/registro-compras', [ExportacionesController::class, 'exportarRegistroComprasTXT']);
        Route::get('/exportar/ventas/txt', [ExportacionesController::class, 'exportarVentasTXT']);
        Route::get('/exportar/kardex/{productoId}/txt', [ExportacionesController::class, 'exportarKardexTXT']);
    });
});
