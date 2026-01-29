<?php

use App\Http\Controllers\Facturacion\AuditoriaSunatController;
use App\Http\Controllers\Facturacion\BajasController;
use App\Http\Controllers\Facturacion\CatalogosSunatController;
use App\Http\Controllers\Facturacion\CertificadosController;
use App\Http\Controllers\Facturacion\ComprobantesArchivosController;
use App\Http\Controllers\Facturacion\ComprobantesController;
use App\Http\Controllers\Facturacion\ContingenciaController;
use App\Http\Controllers\Facturacion\EmpresaEmisoraController;
use App\Http\Controllers\Facturacion\FacturacionManualController;
use App\Http\Controllers\Facturacion\FacturacionStatusController;
use App\Http\Controllers\Facturacion\GuiasRemisionController;
use App\Http\Controllers\Facturacion\NotaCreditoController;
use App\Http\Controllers\Facturacion\NotaDebitoController;
use App\Http\Controllers\Facturacion\ReintentosController;
use App\Http\Controllers\Facturacion\ResumenesController;
use App\Http\Controllers\Facturacion\SerieController;
use App\Http\Controllers\Facturacion\SunatErrorController;
use App\Http\Controllers\Facturacion\WebhookController;
use App\Http\Controllers\VentasController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Facturación Electrónica
|--------------------------------------------------------------------------
|
| Sistema completo de facturación electrónica y comunicación con SUNAT
|
*/

Route::middleware('auth:sanctum')->group(function () {

    // ============================================
    // VENTAS
    // ============================================
    Route::prefix('ventas')->middleware('permission:ventas.ver')->group(function () {
        Route::get('/', [VentasController::class, 'index']);
        Route::get('/estadisticas', [VentasController::class, 'estadisticas']);
        Route::get('/estadisticas-sunat', [VentasController::class, 'estadisticasSunat']);
        Route::get('/pendientes-facturar', [VentasController::class, 'pendientesFacturar']);
        Route::get('/mis-ventas', [VentasController::class, 'misVentas']);
        Route::get('/{id}', [VentasController::class, 'show'])->middleware('permission:ventas.show');
        Route::get('/{id}/pdf', [VentasController::class, 'descargarPdf']);
        Route::get('/{id}/xml', [VentasController::class, 'descargarXml']);
        Route::get('/{id}/cdr', [VentasController::class, 'descargarCdr']);
        Route::get('/{id}/qr', [VentasController::class, 'descargarQr']);
        Route::get('/{id}/historial-sunat', [VentasController::class, 'historialSunat']);
        Route::get('/{id}/whatsapp-datos', [VentasController::class, 'obtenerDatosWhatsApp']);
        Route::get('/{id}/email-datos', [VentasController::class, 'obtenerDatosEmail']);
        Route::get('/{id}/url-publica', [VentasController::class, 'generarUrlPublica']);

        Route::post('/', [VentasController::class, 'store'])->middleware('permission:ventas.create');
        Route::post('/ecommerce', [VentasController::class, 'crearVentaEcommerce'])->middleware('permission:ventas.create');
        Route::put('/{id}', [VentasController::class, 'update'])->middleware('permission:ventas.edit');
        Route::post('/{id}/facturar', [VentasController::class, 'facturar'])->middleware('permission:ventas.facturar');
        Route::post('/{id}/enviar-sunat', [VentasController::class, 'enviarSunat'])->middleware('permission:ventas.facturar');
        Route::post('/{id}/reenviar-sunat', [VentasController::class, 'reenviarSunat'])->middleware('permission:ventas.facturar');
        Route::post('/{id}/consultar-sunat', [VentasController::class, 'consultarSunat'])->middleware('permission:ventas.facturar');
        Route::post('/{id}/generar-pdf', [VentasController::class, 'generarPdf'])->middleware('permission:ventas.facturar');
        Route::post('/{id}/email', [VentasController::class, 'enviarEmail'])->middleware('permission:ventas.edit');
        Route::post('/{id}/whatsapp', [VentasController::class, 'enviarWhatsApp'])->middleware('permission:ventas.edit');
        Route::patch('/{id}/anular', [VentasController::class, 'anular'])->middleware('permission:ventas.delete');
    });

    // ============================================
    // UTILIDADES PARA VENTAS
    // ============================================
    Route::prefix('utilidades')->middleware('permission:ventas.ver')->group(function () {
        Route::get('/clientes/buscar', [VentasController::class, 'buscarCliente']);
        Route::post('/validar-ruc/{ruc}', [VentasController::class, 'validarRuc']);
        Route::get('/buscar-empresa/{ruc}', [VentasController::class, 'buscarEmpresa']);
    });

    // ============================================
    // COMPROBANTES
    // ============================================
    Route::prefix('comprobantes')->middleware('permission:facturacion.comprobantes.ver')->group(function () {
        Route::get('/', [ComprobantesController::class, 'index']);
        Route::get('/buscar', [ComprobantesController::class, 'buscar']); // Nuevo endpoint de búsqueda
        Route::get('/estadisticas', [ComprobantesController::class, 'estadisticas']);
        Route::get('/pendientes-envio', [ComprobantesController::class, 'pendientesEnvio']);
        Route::get('/rechazados', [ComprobantesController::class, 'rechazados']);
        Route::get('/{id}', [ComprobantesController::class, 'show'])->middleware('permission:facturacion.comprobantes.show');
        Route::get('/{id}/pdf', [ComprobantesController::class, 'descargarPdf']);
        Route::get('/{id}/xml', [ComprobantesController::class, 'descargarXml']);
        Route::get('/{id}/cdr', [ComprobantesController::class, 'descargarCdr']);

        Route::post('/{id}/enviar-sunat', [ComprobantesController::class, 'enviarSunat'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/consultar-estado', [ComprobantesController::class, 'consultarEstado'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/regenerar', [ComprobantesController::class, 'regenerar'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/generar-nota-credito', [ComprobantesController::class, 'generarNotaCredito'])->middleware('permission:facturacion.notas_credito.create');
        Route::post('/{id}/generar-nota-debito', [ComprobantesController::class, 'generarNotaDebito'])->middleware('permission:facturacion.notas_debito.create');
        Route::post('/envio-masivo', [ComprobantesController::class, 'envioMasivo'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/reenviar', [ComprobantesController::class, 'reenviar'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/consultar', [ComprobantesController::class, 'consultar'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/email', [ComprobantesController::class, 'enviarEmail'])->middleware('permission:facturacion.comprobantes.edit');
        Route::post('/{id}/whatsapp', [ComprobantesController::class, 'enviarWhatsApp'])->middleware('permission:facturacion.comprobantes.edit');
        Route::patch('/{id}/anular', [ComprobantesController::class, 'anular'])->middleware('permission:facturacion.comprobantes.delete');
    });

    // ============================================
    // SERIES
    // ============================================
    Route::prefix('series')->middleware('permission:facturacion.series.ver')->group(function () {
        Route::get('/', [SerieController::class, 'index']);
        Route::get('/estadisticas', [SerieController::class, 'estadisticas']);

        Route::post('/', [SerieController::class, 'store'])->middleware('permission:facturacion.series.create');
        Route::patch('/{id}', [SerieController::class, 'update'])->middleware('permission:facturacion.series.edit');
        Route::post('/reservar-correlativo', [SerieController::class, 'reservarCorrelativo'])->middleware('permission:facturacion.series.edit');
    });

    // ============================================
    // FACTURAS
    // ============================================
    Route::prefix('facturas')->middleware('permission:facturacion.facturas.ver')->group(function () {
        Route::get('/', [FacturacionManualController::class, 'index']);
        Route::get('/{id}', [FacturacionManualController::class, 'show'])->middleware('permission:facturacion.facturas.show');
        Route::get('/{id}/pdf', [FacturacionManualController::class, 'descargarPdf']);
        Route::get('/{id}/xml', [FacturacionManualController::class, 'descargarXml']);
        Route::get('/buscar-productos', [FacturacionManualController::class, 'buscarProductos']);
        Route::get('/clientes', [FacturacionManualController::class, 'getClientes']);
        Route::get('/series', [FacturacionManualController::class, 'getSeries']);
        Route::get('/estadisticas', [FacturacionManualController::class, 'estadisticas']);

        Route::post('/', [FacturacionManualController::class, 'store'])->middleware('permission:facturacion.facturas.create');
        Route::post('/{id}/enviar-sunat', [FacturacionManualController::class, 'enviarSUNAT'])->middleware('permission:facturacion.facturas.edit');
    });

    // ============================================
    // NOTAS DE CRÉDITO
    // ============================================
    Route::prefix('notas-credito')->middleware('permission:facturacion.notas_credito.ver')->group(function () {
        Route::get('/', [NotaCreditoController::class, 'index']);
        Route::get('/estadisticas', [NotaCreditoController::class, 'estadisticas']);
        Route::get('/{id}', [NotaCreditoController::class, 'show'])->middleware('permission:facturacion.notas_credito.show');
        Route::get('/{id}/pdf', [NotaCreditoController::class, 'descargarPdf'])->middleware('permission:facturacion.notas_credito.show');
        Route::get('/{id}/xml', [NotaCreditoController::class, 'descargarXml'])->middleware('permission:facturacion.notas_credito.show');
        Route::get('/{id}/cdr', [NotaCreditoController::class, 'descargarCdr'])->middleware('permission:facturacion.notas_credito.show');

        Route::post('/', [NotaCreditoController::class, 'store'])->middleware('permission:facturacion.notas_credito.create');
        Route::put('/{id}', [NotaCreditoController::class, 'update'])->middleware('permission:facturacion.notas_credito.edit');
        Route::post('/{id}/generar-xml', [NotaCreditoController::class, 'generarXml'])->middleware('permission:facturacion.notas_credito.edit');
        Route::post('/{id}/enviar-sunat', [NotaCreditoController::class, 'enviarSunat'])->middleware('permission:facturacion.notas_credito.edit');
        Route::post('/{id}/consultar-sunat', [NotaCreditoController::class, 'consultarSunat'])->middleware('permission:facturacion.notas_credito.edit');
        Route::post('/{id}/whatsapp', [NotaCreditoController::class, 'enviarWhatsApp'])->middleware('permission:facturacion.notas_credito.edit');
        Route::post('/{id}/email', [NotaCreditoController::class, 'enviarEmail'])->middleware('permission:facturacion.notas_credito.edit');
    });

    // ============================================
    // NOTAS DE DÉBITO
    // ============================================
    Route::prefix('notas-debito')->middleware('permission:facturacion.notas_debito.ver')->group(function () {
        Route::get('/', [NotaDebitoController::class, 'index']);
        Route::get('/estadisticas', [NotaDebitoController::class, 'estadisticas']);
        Route::get('/{id}', [NotaDebitoController::class, 'show'])->middleware('permission:facturacion.notas_debito.show');
        Route::get('/{id}/pdf', [NotaDebitoController::class, 'descargarPdf'])->middleware('permission:facturacion.notas_debito.show');
        Route::get('/{id}/xml', [NotaDebitoController::class, 'descargarXml'])->middleware('permission:facturacion.notas_debito.show');
        Route::get('/{id}/cdr', [NotaDebitoController::class, 'descargarCdr'])->middleware('permission:facturacion.notas_debito.show');

        Route::post('/', [NotaDebitoController::class, 'store'])->middleware('permission:facturacion.notas_debito.create');
        Route::put('/{id}', [NotaDebitoController::class, 'update'])->middleware('permission:facturacion.notas_debito.edit');
        Route::post('/{id}/generar-xml', [NotaDebitoController::class, 'generarXml'])->middleware('permission:facturacion.notas_debito.edit');
        Route::post('/{id}/enviar-sunat', [NotaDebitoController::class, 'enviarSunat'])->middleware('permission:facturacion.notas_debito.edit');
        Route::post('/{id}/consultar-sunat', [NotaDebitoController::class, 'consultarSunat'])->middleware('permission:facturacion.notas_debito.edit');
        Route::post('/{id}/whatsapp', [NotaDebitoController::class, 'enviarWhatsApp'])->middleware('permission:facturacion.notas_debito.edit');
        Route::post('/{id}/email', [NotaDebitoController::class, 'enviarEmail'])->middleware('permission:facturacion.notas_debito.edit');
    });

    // ============================================
    // GUÍAS DE REMISIÓN
    // ============================================
    Route::prefix('guias-remision')->middleware('permission:facturacion.guias_remision.ver')->group(function () {
        // Obtener tipos de guía
        Route::get('/tipos', [GuiasRemisionController::class, 'tipos']);

        // Búsqueda y filtros
        Route::get('/buscar', [GuiasRemisionController::class, 'buscar']);
        Route::get('/pendientes-envio', [GuiasRemisionController::class, 'pendientesEnvio']);
        Route::get('/rechazadas', [GuiasRemisionController::class, 'rechazadas']);

        // Listar y estadísticas
        Route::get('/', [GuiasRemisionController::class, 'index']);
        Route::get('/estadisticas/resumen', [GuiasRemisionController::class, 'estadisticas']);

        // Ver detalle
        Route::get('/{id}', [GuiasRemisionController::class, 'show'])->middleware('permission:facturacion.guias_remision.show');

        // XML
        Route::get('/{id}/xml', [GuiasRemisionController::class, 'verXml']);
        Route::get('/{id}/ver-xml-archivo', [GuiasRemisionController::class, 'verArchivoXml']);

        // PDF
        Route::get('/{id}/pdf', [GuiasRemisionController::class, 'verPdf']);
        Route::get('/{id}/ver-pdf-archivo', [GuiasRemisionController::class, 'verArchivoPdf']);
        Route::post('/{id}/generar-pdf', [GuiasRemisionController::class, 'generarPdf'])->middleware('permission:facturacion.guias_remision.edit');

        // CDR (descarga)
        Route::get('/{id}/cdr', [GuiasRemisionController::class, 'descargarCdr']);

        // Validaciones
        Route::post('/validar-ubigeo', [GuiasRemisionController::class, 'validarUbigeo']);
        Route::post('/validar-ruc-transportista', [GuiasRemisionController::class, 'validarRucTransportista']);
        Route::post('/validar-placa', [GuiasRemisionController::class, 'validarPlaca']);

        // Notificaciones
        Route::get('/{id}/email-datos', [GuiasRemisionController::class, 'obtenerDatosEmail']);
        Route::post('/{id}/email', [GuiasRemisionController::class, 'enviarEmail'])->middleware('permission:facturacion.guias_remision.edit');
        Route::get('/{id}/whatsapp-datos', [GuiasRemisionController::class, 'obtenerDatosWhatsApp']);
        Route::post('/{id}/whatsapp', [GuiasRemisionController::class, 'enviarWhatsApp'])->middleware('permission:facturacion.guias_remision.edit');

        // Crear guías por tipo
        Route::post('/', [GuiasRemisionController::class, 'store'])->middleware('permission:facturacion.guias_remision.create');
        Route::post('/remitente', [GuiasRemisionController::class, 'storeRemitente'])->middleware('permission:facturacion.guias_remision.create');
        Route::post('/transportista', [GuiasRemisionController::class, 'storeTransportista'])->middleware('permission:facturacion.guias_remision.create');
        Route::post('/traslado-interno', [GuiasRemisionController::class, 'storeInterno'])->middleware('permission:facturacion.guias_remision.create');

        // Actualizar y operaciones SUNAT
        Route::put('/{id}', [GuiasRemisionController::class, 'update'])->middleware('permission:facturacion.guias_remision.edit');
        Route::patch('/{id}/estado-logistico', [GuiasRemisionController::class, 'actualizarEstadoLogistico'])->middleware('permission:facturacion.guias_remision.edit');
        Route::post('/{id}/generar-xml', [GuiasRemisionController::class, 'generarXml'])->middleware('permission:facturacion.guias_remision.edit');
        Route::post('/{id}/enviar-sunat', [GuiasRemisionController::class, 'enviarSunat'])->middleware('permission:facturacion.guias_remision.edit');
        Route::post('/{id}/consultar-sunat', [GuiasRemisionController::class, 'consultarSunat'])->middleware('permission:facturacion.guias_remision.edit');
        
        // Eliminar guía
        Route::delete('/{id}', [GuiasRemisionController::class, 'destroy'])->middleware('permission:facturacion.guias_remision.delete');
    });

    // ============================================
    // WEBHOOKS
    // ============================================
    Route::prefix('webhook')->group(function () {
        Route::post('/pago', [WebhookController::class, 'webhookPago']);
        Route::post('/culqi', [WebhookController::class, 'webhookCulqi']);
    });

    // ============================================
    // CÓDIGOS DE ERROR SUNAT
    // ============================================
    Route::prefix('sunat-errores')->group(function () {
        Route::get('/', [SunatErrorController::class, 'index']);
        Route::get('/categorias', [SunatErrorController::class, 'categorias']);
        Route::get('/estadisticas', [SunatErrorController::class, 'estadisticas']);
        Route::get('/buscar', [SunatErrorController::class, 'buscar']);
        Route::post('/parsear', [SunatErrorController::class, 'parsear']);
        Route::get('/categoria/{categoria}', [SunatErrorController::class, 'porCategoria']);
        Route::get('/{codigo}', [SunatErrorController::class, 'show']);
    });

    // ============================================
    // FACTURACIÓN - MÓDULOS ADICIONALES
    // ============================================
    Route::prefix('facturacion')->group(function () {

        // Certificados
        Route::prefix('certificados')->middleware('permission:facturacion.certificados.ver')->group(function () {
            Route::get('/', [CertificadosController::class, 'index']);
            Route::get('/{id}', [CertificadosController::class, 'show']);
            Route::get('/{id}/validar', [CertificadosController::class, 'validar']);

            Route::post('/', [CertificadosController::class, 'store'])->middleware('permission:facturacion.certificados.create');
            Route::put('/{id}', [CertificadosController::class, 'update'])->middleware('permission:facturacion.certificados.edit');
            Route::post('/{id}/activar', [CertificadosController::class, 'activar'])->middleware('permission:facturacion.certificados.edit');
            Route::delete('/{id}', [CertificadosController::class, 'destroy'])->middleware('permission:facturacion.certificados.delete');
        });

        // Resúmenes (RC)
        Route::prefix('resumenes')->middleware('permission:facturacion.resumenes.ver')->group(function () {
            Route::get('/', [ResumenesController::class, 'index']);
            Route::get('/{id}', [ResumenesController::class, 'show']);
            Route::get('/{id}/xml', [ResumenesController::class, 'xml']);
            Route::get('/{id}/cdr', [ResumenesController::class, 'cdr']);
            Route::get('/{id}/ticket', [ResumenesController::class, 'consultarTicket']);

            Route::post('/', [ResumenesController::class, 'store'])->middleware('permission:facturacion.resumenes.create');
            Route::post('/{id}/enviar', [ResumenesController::class, 'enviar'])->middleware('permission:facturacion.resumenes.edit');
        });

        // Bajas (RA)
        Route::prefix('bajas')->middleware('permission:facturacion.bajas.ver')->group(function () {
            Route::get('/', [BajasController::class, 'index']);
            Route::get('/{id}', [BajasController::class, 'show']);
            Route::get('/{id}/xml', [BajasController::class, 'xml']);
            Route::get('/{id}/cdr', [BajasController::class, 'cdr']);
            Route::get('/{id}/ticket', [BajasController::class, 'consultarTicket']);

            Route::post('/', [BajasController::class, 'store'])->middleware('permission:facturacion.bajas.create');
            Route::post('/{id}/enviar', [BajasController::class, 'enviar'])->middleware('permission:facturacion.bajas.edit');
        });

        // Auditoría
        Route::prefix('auditoria')->middleware('permission:facturacion.auditoria.ver')->group(function () {
            Route::get('/', [AuditoriaSunatController::class, 'index']);
            Route::get('/{id}', [AuditoriaSunatController::class, 'show']);
        });

        // Reintentos
        Route::prefix('reintentos')->middleware('permission:facturacion.reintentos.ver')->group(function () {
            Route::get('/', [ReintentosController::class, 'index']);

            Route::post('/{id}/reintentar', [ReintentosController::class, 'reintentar'])->middleware('permission:facturacion.reintentos.edit');
            Route::post('/reintentar-todo', [ReintentosController::class, 'reintentarTodo'])->middleware('permission:facturacion.reintentos.edit');
            Route::put('/{id}/cancelar', [ReintentosController::class, 'cancelar'])->middleware('permission:facturacion.reintentos.edit');
        });

        // Catálogos SUNAT
        Route::prefix('catalogos')->group(function () {
            Route::get('/', [CatalogosSunatController::class, 'catalogos']);
            Route::get('/principales', [CatalogosSunatController::class, 'catalogosPrincipales']);
            Route::get('/buscar', [CatalogosSunatController::class, 'buscar']);
            Route::get('/estadisticas', [CatalogosSunatController::class, 'estadisticas']);
            Route::get('/{catalogo}', [CatalogosSunatController::class, 'index']);
            Route::get('/{catalogo}/{codigo}', [CatalogosSunatController::class, 'show']);
        });

        // Empresa emisora
        Route::middleware('permission:facturacion.empresa.ver')->group(function () {
            Route::get('/empresa', [EmpresaEmisoraController::class, 'show']);
            Route::get('/empresa/validar', [EmpresaEmisoraController::class, 'validar']);
            Route::get('/empresa/info-publica', [EmpresaEmisoraController::class, 'infoPublica']);

            Route::put('/empresa', [EmpresaEmisoraController::class, 'update'])->middleware('permission:facturacion.empresa.edit');
        });

        // Archivos de comprobantes
        Route::prefix('comprobantes')->middleware('permission:facturacion.comprobantes.ver')->group(function () {
            Route::get('/{id}/xml', [ComprobantesArchivosController::class, 'xml']);
            Route::get('/{id}/cdr', [ComprobantesArchivosController::class, 'cdr']);
            Route::get('/{id}/qr', [ComprobantesArchivosController::class, 'qr']);
        });

        // Salud del servicio
        Route::get('/status', [FacturacionStatusController::class, 'status']);

        // Sistema de Contingencia
        Route::prefix('contingencia')->middleware('permission:facturacion.contingencia.ver')->group(function () {
            Route::get('/info', [ContingenciaController::class, 'info']);
            Route::get('/estadisticas', [ContingenciaController::class, 'estadisticas']);

            Route::post('/activar', [ContingenciaController::class, 'activar'])->middleware('permission:facturacion.contingencia.edit');
            Route::post('/desactivar', [ContingenciaController::class, 'desactivar'])->middleware('permission:facturacion.contingencia.edit');
            Route::post('/regularizar', [ContingenciaController::class, 'regularizar'])->middleware('permission:facturacion.contingencia.edit');
            Route::post('/verificar', [ContingenciaController::class, 'verificar'])->middleware('permission:facturacion.contingencia.edit');
        });
    });
});
