// src/app/services/ventas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============================================
// INTERFACES - ESTRUCTURA API DOCUMENTADA
// ============================================

/**
 * Información del cliente en la lista de ventas
 */
export interface VentaClienteInfo {
  numero_documento: string;
  nombre_completo: string;
  email?: string;
  telefono?: string;
}

/**
 * Información del comprobante electrónico en la lista de ventas
 */
export interface VentaComprobanteInfo {
  documento_tipo: string; // NV=NotaVenta, BT=Boleta, FT=Factura, NC=NotaCredito, ND=NotaDebito
  numero_completo: string; // Ej: "B001-00000001"
  estado: 'GENERADO' | 'PENDIENTE' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'OBSERVADO' | 'ERROR'; // Estados SUNAT
  tiene_xml: boolean;
  tiene_pdf: boolean;
  tiene_cdr: boolean;
  tipo_comprobante: string; // 01=Factura, 03=Boleta, 07=NotaCredito, 08=NotaDebito, 09=NotaVenta
  mensaje_sunat: string | null;
}

/**
 * Venta en lista (GET /api/ventas)
 */
export interface Venta {
  id: number;
  codigo_venta: string;
  cliente_id: number | null;
  user_cliente_id: number | null;
  fecha_venta: string;
  subtotal: string;
  igv: string;
  descuento_total: string;
  total: string;
  estado: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
  metodo_pago: string; // "MIXTO" si hay múltiples pagos
  pagos?: PagoVenta[]; // Desglose de pagos (si aplica)
  cliente_info: VentaClienteInfo;
  comprobante_info?: VentaComprobanteInfo;

  // Relaciones legacy (para compatibilidad)
  cliente?: any;
  userCliente?: any;
  comprobante?: any;
  user?: any;
  detalles?: VentaDetalle[];
}

/**
 * Cliente completo en detalle de venta
 */
export interface VentaCliente {
  id: number;
  numero_documento: string;
  razon_social: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

/**
 * Detalle de producto en venta
 */
export interface VentaDetalle {
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  igv_linea: number;
  total_linea: number;
}

/**
 * Comprobante en detalle de venta
 */
export interface VentaComprobante {
  id: number;
  numero_completo: string;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  tiene_xml: boolean;
  tiene_pdf: boolean;
  tiene_cdr: boolean;
}

/**
 * Información de contacto del cliente
 */
export interface ClienteContacto {
  email: string;
  telefono: string;
  nombre_completo: string;
  numero_documento: string;
}

/**
 * Detalle completo de venta (GET /api/ventas/{id})
 */
export interface VentaDetallada {
  id: number;
  codigo_venta: string;
  fecha_venta: string;
  subtotal: string;
  igv: string;
  descuento_total: string;
  total: string;
  estado: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
  metodo_pago: string; // "MIXTO" si hay múltiples pagos
  pagos?: PagoVenta[]; // Desglose de pagos (si aplica)
  observaciones?: string;
  cliente: VentaCliente;
  cliente_contacto?: ClienteContacto; // Información de contacto consolidada
  detalles: VentaDetalle[];
  comprobante?: VentaComprobante;
}

/**
 * Pago individual para pagos mixtos
 * Según tabla pagos_venta: solo tiene metodo, monto y referencia
 */
export interface PagoVenta {
  metodo_pago: string;  // EFECTIVO, YAPE, PLIN, TARJETA, TRANSFERENCIA, CREDITO
  monto: number;        // Monto de este pago
  referencia?: string;  // Número de operación, referencia, etc. (opcional)
}

/**
 * Request para crear venta (POST /api/ventas)
 * Soporta pago simple o pagos mixtos
 */
export interface CrearVentaRequest {
  cliente_id?: number | null;
  productos: {
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    descuento_unitario?: number;
  }[];
  descuento_total?: number;
  
  // Opción 1: Pago simple (retrocompatible)
  metodo_pago?: string; // EFECTIVO, TARJETA, etc.
  
  // Opción 2: Pagos mixtos (nuevo)
  pagos?: PagoVenta[];
  
  observaciones?: string | null;
  requiere_factura?: boolean;
  cliente_datos?: {
    tipo_documento: string;
    numero_documento: string;
    razon_social: string;
    direccion?: string;
    email?: string;
    telefono?: string;
  };
}

/**
 * Response de crear venta
 */
export interface CrearVentaResponse {
  success: true;
  message: string;
  data: {
    id: number;
    codigo_venta: string;
    total: number;
    estado: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
    metodo_pago?: string; // "MIXTO" si hay múltiples pagos
    pagos?: PagoVenta[]; // Desglose de pagos
    comprobante_id?: number;
    comprobante?: {
      id: number;
      numero_completo: string;
      estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
    };
  };
}

/**
 * Request para facturar venta (POST /api/ventas/{id}/facturar)
 */
export interface FacturarVentaRequest {
  cliente_datos?: {
    tipo_documento: string; // 1=DNI, 4=CE, 6=RUC, 7=PASAPORTE, 0=OTROS
    numero_documento: string;
    razon_social: string;
    direccion: string;
    email?: string;
    telefono?: string;
  };
}

/**
 * Response de facturar venta (Genera comprobante local, NO envía a SUNAT)
 */
export interface FacturarVentaResponse {
  success: true;
  message: string;
  comprobante: {
    id: number;
    numero_completo: string;
    serie: string;
    correlativo: string;
    tipo_comprobante: string; // "01" o "03"
    estado: 'PENDIENTE'; // Siempre PENDIENTE al generar
    fecha_emision: string;
    cliente_razon_social: string;
    cliente_numero_documento: string;
    importe_total: number;
    moneda: string;
    tiene_xml: boolean;
    tiene_pdf: boolean;
    tiene_cdr: boolean;
    mensaje_sunat: string | null;
  };
}

/**
 * Response de enviar a SUNAT (POST /api/ventas/{id}/enviar-sunat)
 */
export interface EnviarSunatResponse {
  success: boolean;
  message: string;
  data: {
    estado: 'ACEPTADO' | 'RECHAZADO' | 'ERROR';
    mensaje_sunat: string;
    numero_completo: string;
    tiene_pdf: boolean;
    tiene_cdr: boolean;
    comprobante: {
      id: number;
      numero_completo: string;
      estado: 'ACEPTADO' | 'RECHAZADO' | 'ERROR';
      mensaje_sunat: string;
      tiene_xml: boolean;
      tiene_pdf: boolean;
      tiene_cdr: boolean;
      fecha_envio_sunat: string;
      fecha_respuesta_sunat: string;
      hash: string;
    };
    venta: {
      id: number;
      estado: 'FACTURADO';
      comprobante_id: number;
    };
  };
}

/**
 * Response de anular venta
 */
export interface AnularVentaResponse {
  message: string;
  venta: {
    id: number;
    estado: 'ANULADO';
  };
}

/**
 * Response de enviar email (POST /api/ventas/{id}/email)
 */
export interface EnviarEmailResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    comprobante: string;
    pdf_url: string;
    xml_url: string;
    fecha_envio: string;
  };
}

/**
 * Response de enviar WhatsApp (POST /api/ventas/{id}/whatsapp)
 */
export interface EnviarWhatsAppResponse {
  success: boolean;
  message: string;
  data: {
    telefono: string;
    comprobante: string;
    whatsapp_url: string;
    fecha_envio: string;
  };
}

/**
 * Respuesta paginada de ventas
 */
export interface VentasPaginatedResponse {
  current_page: number;
  data: Venta[];
  total: number;
  per_page: number;
  last_page: number;
}

/**
 * Estadísticas de ventas (GET /api/ventas/estadisticas)
 */
export interface EstadisticasVentas {
  total_ventas: number;
  monto_total: string;
  ventas_pendientes: number;
  ventas_facturadas: number;
  ventas_ecommerce: number;
  periodo: {
    inicio: string;
    fin: string;
  };
}

// ============================================
// SERVICIO DE VENTAS
// ============================================

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private apiUrl = `${environment.apiUrl}/ventas`;

  constructor(private http: HttpClient) { }

  // ============================================
  // 1. GET /api/ventas - Lista ventas con filtros
  // ============================================
  /**
   * Obtiene lista de ventas con información de comprobantes electrónicos
   * @param filtros Query params: estado, fecha_inicio, fecha_fin, search, page
   */
  obtenerVentas(filtros?: {
    estado?: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
    fecha_inicio?: string; // 2025-10-01
    fecha_fin?: string;    // 2025-10-31
    search?: string;
    page?: number;
  }): Observable<VentasPaginatedResponse> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<VentasPaginatedResponse>(this.apiUrl, { params });
  }

  // ============================================
  // 2. GET /api/ventas/{id} - Detalle completo
  // ============================================
  /**
   * Obtiene detalle completo de una venta
   */
  obtenerVenta(id: number): Observable<VentaDetallada> {
    return this.http.get<{success: boolean, data: VentaDetallada}>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }

  // ============================================
  // 3. POST /api/ventas - Crear venta
  // ============================================
  /**
   * Crea venta y genera comprobante electrónico automáticamente
   * Soporta pago simple o pagos mixtos
   * 
   * @example Pago simple
   * crearVenta({ metodo_pago: 'efectivo', productos: [...] })
   * 
   * @example Pagos mixtos
   * crearVenta({ 
   *   pagos: [
   *     { metodo_pago: 'efectivo', monto: 50 },
   *     { metodo_pago: 'yape', monto: 50 }
   *   ],
   *   productos: [...]
   * })
   */
  crearVenta(venta: CrearVentaRequest): Observable<CrearVentaResponse> {
    return this.http.post<CrearVentaResponse>(this.apiUrl, venta);
  }

  // ============================================
  // 3b. PUT /api/ventas/{id} - Actualizar venta
  // ============================================
  /**
   * Actualiza una venta existente (solo si está en estado PENDIENTE y sin comprobante)
   * Restaura el stock anterior y descuenta el nuevo stock
   * 
   * @param id ID de la venta a actualizar
   * @param venta Datos actualizados de la venta
   * @returns Observable con la respuesta de actualización
   */
  actualizarVenta(id: number, venta: CrearVentaRequest): Observable<CrearVentaResponse> {
    return this.http.put<CrearVentaResponse>(`${this.apiUrl}/${id}`, venta);
  }

  /**
   * Verifica si una venta puede ser editada
   * Una venta es editable si:
   * - Estado es PENDIENTE
   * - No tiene comprobante generado
   * 
   * @param venta Venta a verificar
   * @returns true si la venta puede editarse, false en caso contrario
   */
  puedeEditarVenta(venta: Venta): boolean {
    return venta.estado === 'PENDIENTE' && !venta.comprobante_info;
  }

  /**
   * Valida que la suma de pagos sea igual al total
   * Útil para validar antes de enviar al backend
   */
  validarPagosMixtos(pagos: PagoVenta[], totalVenta: number): { valido: boolean; mensaje?: string } {
    if (!pagos || pagos.length === 0) {
      return { valido: false, mensaje: 'Debe agregar al menos un método de pago' };
    }

    const sumaPagos = pagos.reduce((sum, pago) => sum + pago.monto, 0);
    const diferencia = Math.abs(sumaPagos - totalVenta);

    // Tolerancia de 0.01 para errores de redondeo
    if (diferencia > 0.01) {
      return { 
        valido: false, 
        mensaje: `La suma de pagos (${sumaPagos.toFixed(2)}) no coincide con el total (${totalVenta.toFixed(2)})` 
      };
    }

    return { valido: true };
  }

  // ============================================
  // 4. GET /api/ventas/{id}/xml - Descargar XML
  // ============================================
  /**
   * Descarga XML firmado digitalmente
   * @returns Archivo XML (application/xml)
   */
  descargarXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  // ============================================
  // 5. GET /api/ventas/{id}/pdf - Descargar PDF COMPLETO SUNAT
  // ============================================
  /**
   * Descarga PDF COMPLETO del comprobante con todos los datos SUNAT
   * Incluye: QR, Hash, Datos empresa, Información legal, etc.
   * IMPORTANTE: Usa el mismo PDF que se envía por WhatsApp y Email
   * @returns Archivo PDF (application/pdf)
   */
  descargarPdf(id: number): Observable<Blob> {
    // ✅ CAMBIO: Ahora usa el endpoint del PDF completo SUNAT
    // El backend debe devolver el PDF con todos los parámetros (QR, Hash, Info legal, etc.)
    // Este es el MISMO PDF que se usa en WhatsApp y Email
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  // ============================================
  // 6. GET /api/ventas/{id}/cdr - Descargar CDR
  // ============================================
  /**
   * Descarga CDR (Constancia de Recepción SUNAT)
   * @returns Archivo XML (application/xml)
   */
  descargarCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/cdr`, {
      responseType: 'blob'
    });
  }

  // ============================================
  // 7. POST /api/ventas/{id}/facturar - Facturar (Solo genera comprobante local)
  // ============================================
  /**
   * Genera comprobante electrónico local (XML firmado)
   * NO envía a SUNAT automáticamente
   * NO envía email automáticamente
   * Estado resultante: PENDIENTE
   */
  facturarVenta(id: number, datos?: FacturarVentaRequest): Observable<FacturarVentaResponse> {
    return this.http.post<FacturarVentaResponse>(`${this.apiUrl}/${id}/facturar`, datos || {});
  }

  // ============================================
  // 7b. POST /api/ventas/{id}/enviar-sunat - Enviar a SUNAT
  // ============================================
  /**
   * Envía comprobante a SUNAT (genera PDF y CDR)
   * Cambia estado a ACEPTADO/RECHAZADO
   * NO envía email automáticamente
   */
  enviarComprobanteASunat(id: number): Observable<EnviarSunatResponse> {
    return this.http.post<EnviarSunatResponse>(`${this.apiUrl}/${id}/enviar-sunat`, {});
  }

  // ============================================
  // 8. PATCH /api/ventas/{id}/anular - Anular venta
  // ============================================
  /**
   * Anula venta y restaura stock
   */
  anularVenta(id: number): Observable<AnularVentaResponse> {
    return this.http.patch<AnularVentaResponse>(`${this.apiUrl}/${id}/anular`, {});
  }

  // ============================================
  // 9. POST /api/ventas/{id}/email - Enviar email (MANUAL)
  // ============================================
  /**
   * Envía comprobante por email (ACCIÓN MANUAL)
   * Requiere que el comprobante esté ACEPTADO por SUNAT
   * Requiere que tenga PDF generado
   */
  enviarEmail(id: number, email: string, mensaje?: string): Observable<EnviarEmailResponse> {
    return this.http.post<EnviarEmailResponse>(`${this.apiUrl}/${id}/email`, {
      email,
      mensaje
    });
  }

  // ============================================
  // 9b. POST /api/ventas/{id}/whatsapp - Enviar WhatsApp (MANUAL)
  // ============================================
  /**
   * Envía comprobante por WhatsApp (ACCIÓN MANUAL)
   * Requiere que el comprobante esté ACEPTADO por SUNAT
   * Requiere que tenga PDF generado
   */
  enviarWhatsapp(id: number, telefono: string, mensaje?: string): Observable<EnviarWhatsAppResponse> {
    return this.http.post<EnviarWhatsAppResponse>(`${this.apiUrl}/${id}/whatsapp`, {
      telefono,
      mensaje
    });
  }

  // ============================================
  // OBTENER DATOS PARA EMAIL (OPCIONAL)
  // ============================================
  /**
   * Obtiene datos para pre-llenar el formulario de envío de email
   * GET /api/ventas/{id}/email-datos
   */
  obtenerDatosEmail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/email-datos`);
  }

  // ============================================
  // 10. GET /api/ventas/mis-ventas - Mis ventas (e-commerce)
  // ============================================
  /**
   * Obtiene ventas del cliente autenticado
   */
  obtenerMisVentas(page?: number): Observable<VentasPaginatedResponse> {
    let params = new HttpParams();
    if (page) {
      params = params.set('page', page.toString());
    }
    return this.http.get<VentasPaginatedResponse>(`${this.apiUrl}/mis-ventas`, { params });
  }

  // ============================================
  // 11. POST /api/ventas/ecommerce - Crear venta e-commerce
  // ============================================
  /**
   * Crea venta desde carrito de e-commerce
   */
  crearVentaEcommerce(datos: {
    productos: {
      producto_id: number;
      cantidad: number;
    }[];
    metodo_pago: string;
    requiere_factura?: boolean;
    observaciones?: string;
  }): Observable<CrearVentaResponse> {
    return this.http.post<CrearVentaResponse>(`${this.apiUrl}/ecommerce`, datos);
  }

  // ============================================
  // 11b. POST /api/ventas/{id}/enviar-sunat - Enviar a SUNAT (MANUAL)
  // ============================================
  /**
   * Envía comprobante a SUNAT manualmente
   * Usado cuando el comprobante está en estado GENERADO
   */
  enviarSunat(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/enviar-sunat`, {});
  }

  // ============================================
  // 12. POST /api/ventas/{id}/reenviar-sunat - Reenviar a SUNAT
  // ============================================
  /**
   * Reenvía comprobante a SUNAT
   */
  reenviarSunat(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reenviar-sunat`, {});
  }

  // ============================================
  // 13. POST /api/ventas/{id}/consultar-sunat - Consultar estado en SUNAT
  // ============================================
  /**
   * Consulta estado del comprobante en SUNAT
   */
  consultarSunat(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/consultar-sunat`, {});
  }

  // ============================================
  // 14. POST /api/ventas/{id}/generar-pdf - Generar PDF manualmente
  // ============================================
  /**
   * Genera PDF del comprobante manualmente
   */
  generarPdf(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/generar-pdf`, {});
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Helper para descargar archivos con nombre apropiado
   */
  descargarArchivo(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Determina el color para el badge de estado
   */
  obtenerColorEstado(estado: 'PENDIENTE' | 'FACTURADO' | 'ANULADO'): string {
    const colores = {
      'PENDIENTE': 'warning',
      'FACTURADO': 'success',
      'ANULADO': 'danger'
    };
    return colores[estado] || 'secondary';
  }

  /**
   * Formatea el método de pago para mostrar
   */
  formatearMetodoPago(metodo: string): string {
    const metodos: Record<string, string> = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia',
      'yape': 'Yape',
      'plin': 'Plin',
      'credito': 'Crédito',
      'MIXTO': 'Pago Mixto'
    };
    return metodos[metodo] || metodo;
  }

  /**
   * Obtiene el icono para el método de pago
   */
  obtenerIconoMetodoPago(metodo: string): string {
    const iconos: Record<string, string> = {
      'efectivo': 'ph-money',
      'tarjeta_credito': 'ph-credit-card',
      'tarjeta_debito': 'ph-credit-card',
      'transferencia': 'ph-bank',
      'yape': 'ph-device-mobile',
      'plin': 'ph-device-mobile',
      'credito': 'ph-file-text',
      'MIXTO': 'ph-stack'
    };
    return iconos[metodo] || 'ph-money';
  }

  /**
   * Determina el color para el badge de estado SUNAT
   */
  obtenerColorEstadoSunat(estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO'): string {
    const colores = {
      'PENDIENTE': 'warning',
      'ACEPTADO': 'success',
      'RECHAZADO': 'danger'
    };
    return colores[estado] || 'secondary';
  }

  /**
   * Formatea el tipo de documento para mostrar
   */
  formatearTipoDocumento(tipo: string): string {
    const tiposCodigo: Record<string, string> = {
      '01': 'Factura',
      '03': 'Boleta',
      '07': 'Nota Crédito',
      '08': 'Nota Débito',
      '09': 'Nota Venta'
    };

    const tiposAbrev: Record<string, string> = {
      'FT': 'Factura',
      'BT': 'Boleta',
      'NC': 'Nota Crédito',
      'ND': 'Nota Débito',
      'NV': 'Nota Venta'
    };

    return tiposCodigo[tipo] || tiposAbrev[tipo] || tipo;
  }

  /**
   * Obtener datos prellenados para WhatsApp
   * GET /api/ventas/{id}/whatsapp-datos
   */
  obtenerDatosWhatsApp(ventaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${ventaId}/whatsapp-datos`);
  }

  /**
   * Enviar comprobante por WhatsApp
   * POST /api/ventas/{id}/whatsapp
   * 
   * @param ventaId ID de la venta
   * @param telefono Teléfono del cliente (puede incluir +51 o solo 9 dígitos)
   * @param mensaje Mensaje personalizado (opcional, se genera automáticamente si no se envía)
   * @returns Observable con la URL de WhatsApp y datos del envío
   */
  enviarWhatsApp(ventaId: number, telefono: string, mensaje?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${ventaId}/whatsapp`, {
      telefono,
      mensaje
    });
  }

  /**
   * Generar URL pública del comprobante
   * GET /api/ventas/{id}/url-publica
   */
  generarUrlPublica(ventaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${ventaId}/url-publica`);
  }

  /**
   * Buscar comprobante por número completo
   * GET /api/comprobantes/buscar?numero={numero}
   */
  buscarComprobantePorNumero(numero: string): Observable<any> {
    const params = new HttpParams().set('numero', numero);
    return this.http.get(`${environment.apiUrl}/comprobantes/buscar`, { params });
  }

  /**
   * Obtiene el icono para el tipo de documento
   */
  obtenerIconoTipoDocumento(tipo: 'FT' | 'BI' | 'NC' | 'ND' | 'NV'): string {
    const iconos = {
      'FT': 'ph-file-text',
      'BI': 'ph-receipt',
      'NC': 'ph-arrow-bend-up-left',
      'ND': 'ph-arrow-bend-up-right',
      'NV': 'ph-note'
    };
    return iconos[tipo] || 'ph-file';
  }

  /**
   * Obtiene la clase de color para el tipo de documento
   */
  obtenerColorTipoDocumento(tipo: 'FT' | 'BI' | 'NC' | 'ND' | 'NV'): string {
    const colores = {
      'FT': 'primary',
      'BI': 'success',
      'NC': 'warning',
      'ND': 'purple',
      'NV': 'secondary'
    };
    return colores[tipo] || 'secondary';
  }

  // ============================================
  // ESTADÍSTICAS (Método adicional no documentado en API)
  // ============================================
  /**
   * Obtiene estadísticas de ventas
   * Nota: Este endpoint puede no estar disponible en la API actual
   */
  obtenerEstadisticas(fechaInicio?: string, fechaFin?: string): Observable<EstadisticasVentas> {
    let params = new HttpParams();

    if (fechaInicio) {
      params = params.set('fecha_inicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fecha_fin', fechaFin);
    }

    return this.http.get<EstadisticasVentas>(`${this.apiUrl}/estadisticas`, { params });
  }

  // ============================================
  // BÚSQUEDA DE CLIENTES
  // ============================================

  /**
   * Buscar cliente en el sistema por número de documento
   * GET /api/clientes/buscar-por-documento?numero_documento={documento}
   */
  buscarClientePorDocumento(numeroDocumento: string): Observable<any> {
    const params = new HttpParams().set('numero_documento', numeroDocumento);
    return this.http.get(`${environment.apiUrl}/clientes/buscar-por-documento`, { params });
  }

  /**
   * Buscar información de DNI o RUC en RENIEC/SUNAT
   * GET /api/reniec/buscar/{documento}
   * No requiere autenticación
   */
  buscarEnReniecSunat(documento: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/reniec/buscar/${documento}`);
  }
}