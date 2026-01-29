import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipoGuia {
  codigo: 'REMITENTE' | 'TRANSPORTISTA' | 'INTERNO';
  nombre: string;
  tipo_comprobante: '09' | '31';
  requiere_sunat: boolean;
  descripcion: string;
}

// Interfaces auxiliares para mejor tipado
export interface ClienteBasico {
  id: number;
  razon_social: string;
  numero_documento: string;
  tipo_documento: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

export interface ProductoBasico {
  id: number;
  nombre: string;
  codigo_producto?: string;
  codigo?: string;
  unidad_medida: string;
  precio_venta?: number;
  stock?: number;
}

export interface GuiaRemision {
  id?: number;
  tipo_guia: 'REMITENTE' | 'TRANSPORTISTA' | 'INTERNO';
  tipo_comprobante: '09' | '31';
  requiere_sunat: boolean;
  serie: string;
  correlativo: number;
  numero_completo?: string;
  fecha_emision: string;
  fecha_inicio_traslado: string;
  cliente_id: number;
  cliente?: ClienteBasico;
  destinatario_tipo_documento: string;
  destinatario_numero_documento: string;
  destinatario_razon_social: string;
  destinatario_direccion: string;
  destinatario_ubigeo: string;
  motivo_traslado: string;
  modalidad_traslado: string;
  peso_total: number;
  numero_bultos?: number;
  modo_transporte?: string;
  numero_placa?: string;
  conductor_dni?: string;
  conductor_nombres?: string;

  // Campos para TRANSPORTISTA
  transportista_ruc?: string;
  transportista_razon_social?: string;
  transportista_numero_mtc?: string;
  conductor_tipo_documento?: string;
  conductor_numero_documento?: string;
  conductor_apellidos?: string;
  conductor_licencia?: string;
  vehiculo_placa_principal?: string;
  vehiculo_placa_secundaria?: string;

  punto_partida_ubigeo: string;
  punto_partida_direccion: string;
  punto_llegada_ubigeo: string;
  punto_llegada_direccion: string;
  observaciones?: string;
  estado: string;
  estado_nombre?: string;
  estado_logistico?: string;
  tiene_xml?: boolean;
  tiene_pdf?: boolean;
  tiene_cdr?: boolean;
  xml_firmado?: string;
  mensaje_sunat?: string;
  codigo_hash?: string;
  fecha_aceptacion?: string;
  detalles?: GuiaRemisionDetalle[];
  created_at?: string;
  updated_at?: string;
}

export interface GuiaRemisionDetalle {
  id?: number;
  guia_remision_id?: number;
  item: number;
  producto_id: number;
  producto?: ProductoBasico;
  codigo_producto: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  peso_unitario: number;
  peso_total: number;
  observaciones?: string;
}

export interface GuiaDetallePayload {
  codigo_producto: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  peso_unitario: number;
}

export interface GuiaRemitentePayload {
  cliente_id: number;
  usar_cliente_como_destinatario?: boolean;
  destinatario_tipo_documento?: string;
  destinatario_numero_documento?: string;
  destinatario_razon_social?: string;
  destinatario_direccion?: string;
  destinatario_ubigeo?: string;
  motivo_traslado: string;
  modalidad_traslado: string;
  fecha_inicio_traslado: string;
  punto_partida_ubigeo: string;
  punto_partida_direccion: string;
  punto_llegada_ubigeo: string;
  punto_llegada_direccion: string;
  modo_transporte?: string;
  // Modalidad 02 - Transporte Privado
  numero_placa?: string;
  conductor_dni?: string;
  conductor_nombres?: string;
  // Modalidad 01 - Transporte Público
  ruc_transportista?: string;
  razon_social_transportista?: string;
  productos: Array<{
    producto_id: number;
    cantidad: number;
    peso_unitario: number;
    observaciones?: string;
  }>;
  numero_bultos?: number;
  observaciones?: string;
}

export interface GuiaTransportistaPayload {
  // Datos del transportista (OBLIGATORIOS)
  transportista_ruc: string;
  transportista_razon_social: string;
  transportista_numero_mtc: string;
  
  // Datos del conductor (OBLIGATORIOS)
  conductor_tipo_documento: string;
  conductor_numero_documento: string;
  conductor_nombres: string;
  conductor_apellidos: string;
  conductor_licencia?: string;
  
  // Datos del vehículo (OBLIGATORIOS)
  vehiculo_placa_principal: string;
  vehiculo_placa_secundaria?: string;
  
  // Destinatario
  destinatario_tipo_documento: string;
  destinatario_numero_documento: string;
  destinatario_razon_social: string;
  destinatario_direccion: string;
  destinatario_ubigeo: string;
  
  // Traslado
  motivo_traslado: string;
  modalidad_traslado: string;
  fecha_inicio_traslado: string;
  peso_total?: number;
  numero_bultos?: number;
  
  // Puntos
  punto_partida_ubigeo: string;
  punto_partida_direccion: string;
  punto_llegada_ubigeo: string;
  punto_llegada_direccion: string;
  
  // Productos
  productos: Array<{
    producto_id: number;
    cantidad: number;
    peso_unitario: number;
    observaciones?: string;
  }>;
  
  observaciones?: string;
}

export interface GuiaInternoPayload {
  motivo_traslado: string;
  fecha_inicio_traslado: string;
  punto_partida_ubigeo: string;
  punto_partida_direccion: string;
  punto_llegada_ubigeo: string;
  punto_llegada_direccion: string;
  productos: Array<{
    producto_id: number;
    cantidad: number;
    peso_unitario: number;
    observaciones?: string;
  }>;
  numero_bultos?: number;
  observaciones?: string;
  destinatario_tipo_documento?: string;
  destinatario_numero_documento?: string;
  destinatario_razon_social?: string;
  destinatario_direccion?: string;
  destinatario_ubigeo?: string;
}

export interface EstadisticasGuias {
  total_guias: number;
  guias_pendientes: number;
  guias_aceptadas: number;
  guias_rechazadas: number;
  peso_total_transportado: number;
  por_tipo?: {
    remitente: number;
    interno: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GuiasRemisionService {
  private apiUrl = `${environment.apiUrl}/guias-remision`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener tipos de guía disponibles
   */
  getTiposGuia(): Observable<{ success: boolean; data: TipoGuia[] }> {
    return this.http.get<{ success: boolean; data: TipoGuia[] }>(`${this.apiUrl}/tipos`);
  }

  /**
   * Listar guías de remisión con filtros
   */
  getGuias(filtros?: {
    tipo_guia?: 'REMITENTE' | 'INTERNO';
    estado?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    cliente_id?: number;
    serie?: string;
    page?: number;
    per_page?: number;
  }): Observable<any> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  /**
   * Obtener detalle de una guía
   */
  getGuia(id: number): Observable<{ success: boolean; data: GuiaRemision }> {
    return this.http.get<{ success: boolean; data: GuiaRemision }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear GRE Remitente
   */
  crearGuiaRemitente(datos: GuiaRemitentePayload): Observable<{ success: boolean; message: string; data: GuiaRemision }> {
    return this.http.post<{ success: boolean; message: string; data: GuiaRemision }>(`${this.apiUrl}/remitente`, datos);
  }

  /**
   * Crear Guía de Remisión Transportista
   */
  crearGuiaTransportista(datos: GuiaTransportistaPayload): Observable<{ success: boolean; message: string; data: GuiaRemision }> {
    return this.http.post<{ success: boolean; message: string; data: GuiaRemision }>(`${this.apiUrl}/transportista`, datos);
  }

  /**
   * Crear Traslado Interno
   */
  crearTrasladoInterno(datos: GuiaInternoPayload): Observable<{ success: boolean; message: string; data: GuiaRemision }> {
    return this.http.post<{ success: boolean; message: string; data: GuiaRemision }>(`${this.apiUrl}/traslado-interno`, datos);
  }

  /**
   * Enviar guía a SUNAT
   */
  enviarSunat(id: number): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.post<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/${id}/enviar-sunat`, {});
  }

  // ==================== GESTIÓN DE XML ====================

  /**
   * Descargar XML (retorna el archivo directamente)
   */
  descargarXml(id: number, numeroCompleto: string): Observable<Blob> {
    const numeroFormateado = this.formatearNumeroCompleto(numeroCompleto);
    return this.http.get(`${environment.apiUrl}/guia-remision/xml/${id}/${numeroFormateado}`, { 
      responseType: 'blob',
      headers: { 'Accept': 'application/xml' }
    });
  }

  /**
   * Ver XML en navegador (abre en nueva pestaña)
   * Asegura que el numeroCompleto tenga el formato correcto: SERIE-CORRELATIVO (8 dígitos)
   */
  verXmlArchivo(id: number, numeroCompleto: string, serie?: string, correlativo?: number): string {
    // Si no viene numeroCompleto pero sí serie y correlativo, construirlo
    let numeroAUsar = numeroCompleto;
    if (!numeroAUsar && serie && correlativo !== undefined) {
      numeroAUsar = `${serie}-${correlativo}`;
    }
    
    // Validar y formatear el numeroCompleto
    const numeroFormateado = this.formatearNumeroCompleto(numeroAUsar);
    return `${environment.apiUrl}/guia-remision/xml/${id}/${numeroFormateado}`;
  }

  /**
   * Formatea el número completo asegurando que el correlativo tenga 8 dígitos
   * Formato esperado: SERIE-CORRELATIVO (ej: T001-00000019)
   */
  private formatearNumeroCompleto(numeroCompleto: string): string {
    if (!numeroCompleto) {
      throw new Error('Número completo no proporcionado');
    }

    // Si ya tiene el formato correcto (serie-8dígitos), retornarlo
    const partes = numeroCompleto.split('-');
    if (partes.length === 2) {
      const serie = partes[0];
      const correlativo = partes[1];
      
      // Si el correlativo ya tiene 8 dígitos, retornar tal cual
      if (correlativo.length === 8) {
        return numeroCompleto;
      }
      
      // Si tiene menos de 8 dígitos, rellenar con ceros a la izquierda
      const correlativoFormateado = correlativo.padStart(8, '0');
      return `${serie}-${correlativoFormateado}`;
    }
    
    // Si no tiene el formato esperado, retornar tal cual y dejar que el backend maneje el error
    return numeroCompleto;
  }

  /**
   * Obtener estadísticas de guías
   */
  getEstadisticas(filtros?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<{ success: boolean; data: EstadisticasGuias }> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value) {
          params = params.set(key, value);
        }
      });
    }

    return this.http.get<{ success: boolean; data: EstadisticasGuias }>(`${this.apiUrl}/estadisticas/resumen`, { params });
  }

  // ==================== GESTIÓN DE PDF ====================

  /**
   * Obtener URL del PDF
   */
  getPdf(id: number): Observable<{ success: boolean; data: { url: string; filename: string } }> {
    return this.http.get<{ success: boolean; data: { url: string; filename: string } }>(`${this.apiUrl}/${id}/pdf`);
  }

  /**
   * NOTA: La API NO tiene endpoint para descargar PDF directamente
   * Solo retorna URL con getPdf() que apunta a /ver-pdf-archivo
   * El navegador maneja la descarga desde esa URL
   */

  /**
   * Descargar CDR (Constancia de Recepción)
   */
  descargarCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/cdr`, { responseType: 'blob' });
  }

  /**
   * Regenerar PDF
   */
  generarPdf(id: number): Observable<{ success: boolean; message: string; data: { url: string; filename: string } }> {
    return this.http.post<{ success: boolean; message: string; data: { url: string; filename: string } }>(`${this.apiUrl}/${id}/generar-pdf`, {});
  }

  /**
   * Generar XML firmado (y PDF automáticamente)
   */
  generarXml(id: number): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.post<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/${id}/generar-xml`, {});
  }

  // ==================== OPERACIONES SUNAT ====================

  /**
   * Consultar estado en SUNAT
   */
  consultarSunat(id: number): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.post<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/${id}/consultar-sunat`, {});
  }

  /**
   * Actualizar guía (solo PENDIENTE y sin XML)
   */
  actualizarGuia(id: number, datos: Partial<GuiaRemitentePayload | GuiaInternoPayload>): Observable<{ success: boolean; message: string; data: GuiaRemision }> {
    return this.http.put<{ success: boolean; message: string; data: GuiaRemision }>(`${this.apiUrl}/${id}`, datos);
  }

  /**
   * Eliminar guía (solo PENDIENTE y sin XML)
   */
  eliminarGuia(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  // ==================== NOTIFICACIONES ====================

  /**
   * Enviar guía por correo
   */
  enviarEmail(id: number, datos: { email: string; mensaje?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/email`, datos);
  }

  /**
   * Enviar guía por WhatsApp
   */
  enviarWhatsapp(id: number, datos: { telefono: string; mensaje?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/whatsapp`, datos);
  }

  /**
   * Obtener datos para WhatsApp
   */
  getWhatsappDatos(id: number): Observable<{ success: boolean; data: { telefono: string; mensaje: string; url: string } }> {
    return this.http.get<{ success: boolean; data: { telefono: string; mensaje: string; url: string } }>(`${this.apiUrl}/${id}/whatsapp-datos`);
  }

  /**
   * Obtener datos para Email
   */
  getEmailDatos(id: number): Observable<{ success: boolean; data: { email: string; asunto: string; mensaje: string } }> {
    return this.http.get<{ success: boolean; data: { email: string; asunto: string; mensaje: string } }>(`${this.apiUrl}/${id}/email-datos`);
  }

  // ==================== BÚSQUEDA Y FILTROS ====================

  /**
   * Búsqueda avanzada
   */
  buscar(termino: string, filtros?: any): Observable<any> {
    let params = new HttpParams().set('q', termino);

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/buscar`, { params });
  }

  /**
   * Listar guías pendientes de envío
   */
  getPendientesEnvio(filtros?: any): Observable<any> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/pendientes-envio`, { params });
  }

  /**
   * Listar guías rechazadas
   */
  getRechazadas(filtros?: any): Observable<any> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = filtros[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/rechazadas`, { params });
  }

  // ==================== VALIDACIONES ====================

  /**
   * Validar ubigeo
   */
  validarUbigeo(ubigeo: string): Observable<{ success: boolean; data: { valido: boolean; departamento?: string; provincia?: string; distrito?: string } }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/validar-ubigeo`, { ubigeo });
  }

  /**
   * Validar RUC de transportista
   */
  validarRucTransportista(ruc: string): Observable<{ success: boolean; data: { valido: boolean; razon_social?: string; estado?: string } }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/validar-ruc-transportista`, { ruc });
  }

  /**
   * Validar placa vehicular
   */
  validarPlaca(placa: string): Observable<{ success: boolean; data: { valido: boolean; formato_correcto: boolean } }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/validar-placa`, { placa });
  }

  // ==================== ESTADO LOGÍSTICO ====================

  /**
   * Actualizar estado logístico (físico) del traslado
   */
  actualizarEstadoLogistico(id: number, estado: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/estado-logistico`, { estado_logistico: estado });
  }
}
