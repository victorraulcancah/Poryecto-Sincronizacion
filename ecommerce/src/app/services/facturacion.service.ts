import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Empresa,
  Certificado,
  Serie,
  Cliente,
  Venta,
  VentaFormData,
  FacturarFormData,
  Comprobante,
  NotaCreditoFormData,
  BajaFormData,
  Resumen,
  Baja,
  AuditoriaSunat,
  ApiResponse,
  PaginatedResponse
} from '../models/facturacion.model';

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private apiUrl = environment.apiUrl; // URL del backend Laravel

  constructor(private http: HttpClient) { }

  // ============================================
  // CONFIGURACIÓN DE EMISOR
  // ============================================

  /**
   * Obtener configuración del emisor
   */
  getEmisor(): Observable<ApiResponse<Empresa>> {
    return this.http.get<ApiResponse<Empresa>>(`${this.apiUrl}/empresa-emisora`);
  }

  /**
   * Actualizar configuración del emisor
   */
  updateEmisor(empresa: Partial<Empresa>): Observable<ApiResponse<Empresa>> {
    return this.http.put<ApiResponse<Empresa>>(`${this.apiUrl}/empresa-emisora`, empresa);
  }

  /**
   * Subir certificado digital
   */
  uploadCertificado(certificado: File, password: string): Observable<ApiResponse<Certificado>> {
    const formData = new FormData();
    formData.append('certificado', certificado);
    formData.append('password', password);

    return this.http.post<ApiResponse<Certificado>>(`${this.apiUrl}/certificados`, formData);
  }

  // ============================================
  // CATÁLOGOS SUNAT
  // ============================================

  /**
   * Obtener catálogos de SUNAT
   */
  getCatalogos(tipo: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/facturacion/catalogos/${tipo}`);
  }

  // ============================================
  // SERIES Y CORRELATIVOS
  // ============================================

  /**
   * Obtener series
   */
  getSeries(params?: any): Observable<ApiResponse<Serie[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<Serie[]>>(`${this.apiUrl}/series`, { params: httpParams });
  }

  /**
   * Crear nueva serie
   */
  createSerie(serie: Partial<Serie>): Observable<ApiResponse<Serie>> {
    return this.http.post<ApiResponse<Serie>>(`${this.apiUrl}/series`, serie);
  }

  /**
   * Actualizar serie
   */
  updateSerie(id: number, serie: Partial<Serie>): Observable<ApiResponse<Serie>> {
    return this.http.patch<ApiResponse<Serie>>(`${this.apiUrl}/series/${id}`, serie);
  }

  /**
   * Reservar correlativo
   */
  reservarCorrelativo(serieId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/series/reservar-correlativo`, {
      serie_id: serieId
    });
  }

  // ============================================
  // CLIENTES
  // ============================================

  /**
   * Obtener clientes
   */
  getClientes(params?: any): Observable<PaginatedResponse<Cliente>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Cliente>>(`${this.apiUrl}/clientes`, { params: httpParams });
  }

  /**
   * Crear cliente
   */
  createCliente(cliente: Partial<Cliente>): Observable<ApiResponse<Cliente>> {
    return this.http.post<ApiResponse<Cliente>>(`${this.apiUrl}/clientes`, cliente);
  }

  /**
   * Actualizar cliente
   */
  updateCliente(id: number, cliente: Partial<Cliente>): Observable<ApiResponse<Cliente>> {
    return this.http.put<ApiResponse<Cliente>>(`${this.apiUrl}/clientes/${id}`, cliente);
  }

  /**
   * Buscar cliente por número de documento
   */
  buscarClientePorDocumento(numeroDocumento: string): Observable<ApiResponse<Cliente[]>> {
    return this.http.get<ApiResponse<Cliente[]>>(`${this.apiUrl}/clientes/buscar-por-documento`, {
      params: { numero_documento: numeroDocumento }
    });
  }

  // ============================================
  // VENTAS - Documentación API actualizada
  // ============================================

  /**
   * 1. GET /api/ventas - Lista ventas con información de comprobantes electrónicos
   * Query Params: estado, fecha_inicio, fecha_fin, search, page
   */
  getVentas(params?: {
    estado?: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
    fecha_inicio?: string;
    fecha_fin?: string;
    search?: string;
    page?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== null && value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/ventas`, { params: httpParams });
  }

  /**
   * 2. GET /api/ventas/{id} - Obtiene detalle completo de una venta
   */
  getVenta(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ventas/${id}`);
  }

  /**
   * 3. POST /api/ventas - Crea venta y genera comprobante electrónico automáticamente
   */
  createVenta(venta: {
    cliente_id: number;
    productos: {
      producto_id: number;
      cantidad: number;
      precio_unitario: number;
      descuento_unitario?: number;
    }[];
    descuento_total?: number;
    metodo_pago: string;
    observaciones?: string | null;
    requiere_factura?: boolean;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ventas`, venta);
  }

  /**
   * 4. GET /api/ventas/{id}/xml - Descarga XML firmado digitalmente
   */
  downloadXmlVenta(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/ventas/${id}/xml`, { responseType: 'blob' });
  }

  /**
   * 5. GET /api/ventas/{id}/pdf - Descarga PDF del comprobante
   */
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/ventas/${id}/pdf`, { responseType: 'blob' });
  }

  /**
   * 6. GET /api/ventas/{id}/cdr - Descarga CDR (Constancia de Recepción SUNAT)
   */
  downloadCdrVenta(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/ventas/${id}/cdr`, { responseType: 'blob' });
  }

  /**
   * 7. POST /api/ventas/{id}/facturar - Genera comprobante para venta existente
   */
  facturarVenta(id: number, datos: {
    cliente_datos: {
      tipo_documento: string;
      numero_documento: string;
      razon_social: string;
      direccion: string;
      email?: string;
    };
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ventas/${id}/facturar`, datos);
  }

  /**
   * 8. PUT /api/ventas/{id}/anular - Anula venta y restaura stock
   */
  anularVenta(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/ventas/${id}/anular`, {});
  }

  /**
   * Enviar comprobante por email
   */
  enviarEmail(id: number, email?: string): Observable<ApiResponse<any>> {
    const body = email ? { to: email } : {};
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/ventas/${id}/email`, body);
  }

  // ============================================
  // COMPROBANTES
  // ============================================

  /**
   * Obtener comprobantes
   */
  getComprobantes(params?: any): Observable<PaginatedResponse<Comprobante>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Comprobante>>(`${this.apiUrl}/comprobantes`, { params: httpParams });
  }

  /**
   * Obtener comprobante por ID
   */
  getComprobante(id: number): Observable<ApiResponse<Comprobante>> {
    return this.http.get<ApiResponse<Comprobante>>(`${this.apiUrl}/comprobantes/${id}`);
  }

  /**
   * Reenviar comprobante a SUNAT
   */
  reenviarComprobante(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/comprobantes/${id}/reenviar`, {});
  }

  /**
   * Consultar estado en SUNAT
   */
  consultarEstado(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/comprobantes/${id}/consultar`, {});
  }

  /**
   * Descargar XML del comprobante
   */
  downloadXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/comprobantes/${id}/xml`, { responseType: 'blob' });
  }

  /**
   * Descargar CDR del comprobante
   */
  downloadCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/comprobantes/${id}/cdr`, { responseType: 'blob' });
  }

  /**
   * Descargar PDF del comprobante
   */
  downloadComprobantePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/comprobantes/${id}/pdf`, { responseType: 'blob' });
  }

  // ============================================
  // NOTAS DE CRÉDITO
  // ============================================

  /**
   * Emitir nota de crédito
   */
  emitirNotaCredito(datos: NotaCreditoFormData): Observable<ApiResponse<Comprobante>> {
    return this.http.post<ApiResponse<Comprobante>>(`${this.apiUrl}/notas-credito`, datos);
  }

  /**
   * Obtener notas de crédito
   */
  getNotasCredito(params?: any): Observable<PaginatedResponse<Comprobante>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Comprobante>>(`${this.apiUrl}/notas-credito`, { params: httpParams });
  }

  /**
   * Descargar PDF de nota de crédito
   */
  downloadNotaCreditoPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/notas-credito/${id}/pdf`, { responseType: 'blob' });
  }

  // ============================================
  // NOTAS DE DÉBITO
  // ============================================

  /**
   * Emitir nota de débito
   */
  emitirNotaDebito(datos: NotaCreditoFormData): Observable<ApiResponse<Comprobante>> {
    return this.http.post<ApiResponse<Comprobante>>(`${this.apiUrl}/notas-debito`, datos);
  }

  /**
   * Obtener notas de débito
   */
  getNotasDebito(params?: any): Observable<PaginatedResponse<Comprobante>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Comprobante>>(`${this.apiUrl}/notas-debito`, { params: httpParams });
  }

  // ============================================
  // RESÚMENES DIARIOS
  // ============================================

  /**
   * Crear resumen diario
   */
  crearResumen(fecha: string, comprobantes: any[]): Observable<ApiResponse<Resumen>> {
    return this.http.post<ApiResponse<Resumen>>(`${this.apiUrl}/facturacion/resumenes`, {
      fecha,
      comprobantes
    });
  }

  /**
   * Obtener resúmenes
   */
  getResumenes(params?: any): Observable<PaginatedResponse<Resumen>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Resumen>>(`${this.apiUrl}/facturacion/resumenes`, { params: httpParams });
  }

  /**
   * Consultar estado de resumen
   */
  consultarEstadoResumen(ticket: string): Observable<ApiResponse<Resumen>> {
    return this.http.get<ApiResponse<Resumen>>(`${this.apiUrl}/facturacion/resumenes/${ticket}`);
  }

  // ============================================
  // COMUNICACIONES DE BAJA
  // ============================================

  /**
   * Enviar comunicación de baja
   */
  enviarBaja(datos: BajaFormData): Observable<ApiResponse<Baja>> {
    return this.http.post<ApiResponse<Baja>>(`${this.apiUrl}/facturacion/bajas`, datos);
  }

  /**
   * Obtener bajas
   */
  getBajas(params?: any): Observable<PaginatedResponse<Baja>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Baja>>(`${this.apiUrl}/facturacion/bajas`, { params: httpParams });
  }

  /**
   * Consultar estado de baja
   */
  consultarEstadoBaja(ticket: string): Observable<ApiResponse<Baja>> {
    return this.http.get<ApiResponse<Baja>>(`${this.apiUrl}/facturacion/bajas/${ticket}`);
  }

  // ============================================
  // AUDITORÍA Y REINTENTOS
  // ============================================

  /**
   * Obtener auditoría SUNAT
   */
  getAuditoria(params?: any): Observable<PaginatedResponse<AuditoriaSunat>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<AuditoriaSunat>>(`${this.apiUrl}/facturacion/auditoria`, { params: httpParams });
  }

  /**
   * Obtener cola de reintentos
   */
  getReintentos(params?: any): Observable<PaginatedResponse<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/facturacion/reintentos`, { params: httpParams });
  }

  /**
   * Reintentar operación
   */
  reintentarOperacion(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/cola-reintentos/${id}/reintentar`, {});
  }

  // ============================================
  // FACTURACIÓN MANUAL
  // ============================================

  /**
   * Obtener facturas manuales
   */
  getFacturas(params?: any): Observable<PaginatedResponse<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/facturas`, { params: httpParams });
  }

  /**
   * Crear factura/boleta manual
   */
  createFactura(factura: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/facturas`, factura);
  }

  /**
   * Obtener detalle de factura manual
   */
  getFactura(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/facturas/${id}`);
  }

  /**
   * Enviar factura a SUNAT
   */
  enviarFacturaSunat(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/facturas/${id}/enviar-sunat`, {});
  }

  /**
   * Buscar productos para facturación
   */
  buscarProductosFacturacion(params?: any): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/facturas/buscar-productos`, { params: httpParams });
  }

  /**
   * Obtener clientes para facturación
   */
  getClientesFacturacion(params?: any): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/facturas/clientes`, { params: httpParams });
  }

  /**
   * Obtener series para facturación
   */
  getSeriesFacturacion(params?: any): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/facturas/series`, { params: httpParams });
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Validar RUC con SUNAT
   */
  validarRUC(ruc: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/utilidades/validar-ruc/${ruc}`);
  }

  /**
   * Buscar empresa por RUC
   */
  buscarEmpresaPorRUC(ruc: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/utilidades/buscar-empresa/${ruc}`);
  }

  /**
   * Obtener productos
   */
  getProductos(params?: any): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/productos`, { params: httpParams });
  }


  /**
   * Obtener cliente por documento
   */
  getClienteByDocumento(tipo: string, numero: string): Observable<ApiResponse<Cliente>> {
    return this.http.get<ApiResponse<Cliente>>(`${this.apiUrl}/clientes/${tipo}/${numero}`);
  }

  /**
   * Obtener estado del sistema
   */
  getEstadoSistema(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/facturacion/status`);
  }

  /**
   * Generar URL de destino por defecto
   */
  generarUrlDestinoDefault(recompensaId: number): string {
    return `/recompensas/${recompensaId}`;
  }

  // ============================================
  // MÉTODOS DE PRUEBA Y DIAGNÓSTICO
  // ============================================

  /**
   * Probar conectividad de APIs principales
   */
  probarConectividad(): Observable<any> {
    const pruebas = {
      ventas: this.http.get(`${this.apiUrl}/ventas?page=1&per_page=1`),
      clientes: this.http.get(`${this.apiUrl}/clientes?page=1&per_page=1`),
      productos: this.http.get(`${this.apiUrl}/productos?page=1&per_page=1`),
      series: this.http.get(`${this.apiUrl}/series?page=1&per_page=1`),
      comprobantes: this.http.get(`${this.apiUrl}/comprobantes?page=1&per_page=1`),
      facturas: this.http.get(`${this.apiUrl}/facturas?page=1&per_page=1`),
      estado: this.http.get(`${this.apiUrl}/facturacion/status`)
    };

    return this.http.get(`${this.apiUrl}/health-check`);
  }

  /**
   * Verificar estado de un endpoint específico
   */
  verificarEndpoint(endpoint: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${endpoint}`);
  }

  // ============================================
  // CONFIGURACIÓN DE EMPRESA
  // ============================================

  /**
   * Obtener datos de la empresa
   */
  getEmpresa(): Observable<any> {
    return this.http.get(`${this.apiUrl}/facturacion/empresa`);
  }

  /**
   * Actualizar datos de la empresa
   */
  updateEmpresa(datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/facturacion/empresa`, datos);
  }

  // ============================================
  // CERTIFICADOS DIGITALES
  // ============================================

  /**
   * Obtener certificados
   */
  getCertificados(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/facturacion/certificados`);
  }

  /**
   * Subir certificado
   */
  subirCertificado(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/facturacion/certificados`, formData);
  }

  /**
   * Validar certificado
   */
  validarCertificado(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/facturacion/certificados/${id}/validar`);
  }

  /**
   * Activar certificado
   */
  activarCertificado(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/facturacion/certificados/${id}/activar`, {});
  }

  /**
   * Eliminar certificado
   */
  eliminarCertificado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/facturacion/certificados/${id}`);
  }

  /**
   * Procesar reintentos
   */
  procesarReintentos(): Observable<any> {
    return this.http.post(`${this.apiUrl}/facturacion/reintentos/reintentar-todo`, {});
  }

  /**
   * Verificar conexión SUNAT
   */
  verificarSUNAT(): Observable<any> {
    return this.http.get(`${this.apiUrl}/facturacion/test/estado-sunat`);
  }

  // ============================================
  // NOTAS DE CRÉDITO (MÉTODOS ADICIONALES)
  // ============================================

  /**
   * Crear nota de crédito
   */
  crearNotaCredito(datos: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/facturacion/notas-credito`, datos);
  }

  /**
   * Obtener nota de crédito por ID
   */
  getNotaCredito(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/facturacion/notas-credito/${id}`);
  }

  // ============================================
  // NOTAS DE DÉBITO (MÉTODOS ADICIONALES)
  // ============================================

  /**
   * Crear nota de débito
   */
  crearNotaDebito(datos: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/facturacion/notas-debito`, datos);
  }

  /**
   * Obtener nota de débito por ID
   */
  getNotaDebito(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/facturacion/notas-debito/${id}`);
  }

  // ============================================
  // CATÁLOGOS SUNAT
  // ============================================

  /**
   * Obtener catálogo SUNAT
   */
  getCatalogo(tipo: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/facturacion/catalogos/${tipo}`);
  }

  // ============================================
  // DASHBOARD Y KPIs
  // ============================================

  /**
   * Obtener KPIs de facturación
   */
  getKPIs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/facturacion/kpis`);
  }

  /**
   * Generar comprobante desde venta
   */
  generarComprobanteVenta(ventaId: number, datos: {
    tipo_comprobante: string;
    cliente: {
      tipo_documento: string;
      numero_documento: string;
      nombre: string;
      direccion?: string;
      email?: string;
      telefono?: string;
    };
  }): Observable<ApiResponse<Comprobante>> {
    return this.http.post<ApiResponse<Comprobante>>(`${this.apiUrl}/ventas/${ventaId}/generar-comprobante`, datos);
  }

  /**
   * Buscar comprobante por número completo
   * GET /api/comprobantes/buscar?numero={numero}
   */
  buscarComprobantePorNumero(numero: string): Observable<any> {
    const params = new HttpParams().set('numero', numero);
    return this.http.get(`${this.apiUrl}/comprobantes/buscar`, { params });
  }
}
