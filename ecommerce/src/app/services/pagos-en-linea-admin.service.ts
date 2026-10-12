import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Compras por pasarela de pago vistas desde el panel del personal.
 *
 * El negocio las atiende a mano: ve la compra acá, factura en el ERP 7Power,
 * sube el PDF del comprobante que emitió allá para enviárselo al cliente y lo
 * llama para coordinar el delivery. Este servicio solo lista, deja constancia
 * del seguimiento y guarda/envía ese PDF; no genera comprobantes, no factura
 * ni toca el stock.
 */

/** Resultado del cobro en la pasarela. */
export type EstadoPagoEnLinea = 'pagado' | 'rechazado';

/** Filtro del listado por resultado del cobro (`todos` no filtra). */
export type FiltroEstadoPago = EstadoPagoEnLinea | 'todos';

/** Etapa de la atención manual de una compra pagada. */
export type EstadoProcesoPago =
  | 'pendiente_facturar'
  | 'facturado'
  | 'en_delivery'
  | 'entregado'
  | 'cancelado';

/** Línea de una compra. */
export interface PagoAdminItem {
  producto_id: number;
  codigo_producto: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen_url: string | null;
}

/** Compra tal como la entrega el panel. */
export interface PagoAdmin {
  id: number;
  codigo: string;
  /** Fecha de la compra (ISO 8601). */
  fecha: string;
  estado: EstadoPagoEnLinea;
  estado_proceso: EstadoProcesoPago;
  /** Compra hecha con la pasarela en modo prueba (sin cobro real). */
  simulado: boolean;
  /** 's' soles, 'd' dólares. */
  moneda: string;
  subtotal: number;
  igv: number;
  descuento: number;
  cupon_codigo: string | null;
  costo_envio: number;
  total: number;
  referencia_pasarela: string | null;
  mensaje_pasarela: string | null;
  tarjeta_marca: string | null;
  tarjeta_ultimos4: string | null;
  cliente_nombre: string;
  cliente_email: string;
  numero_documento: string | null;
  telefono_contacto: string | null;
  direccion_envio: string | null;
  departamento_nombre: string | null;
  provincia_nombre: string | null;
  distrito_nombre: string | null;
  observaciones: string | null;
  /** N° del comprobante emitido a mano en el ERP. */
  comprobante_erp: string | null;
  notas_internas: string | null;
  atendido_at: string | null;
  email_enviado_at: string | null;
  /** Código de cliente 7Power vinculado a la cuenta (null si no está vinculada). */
  codigo_erp: string | null;
  /** Lista de precio del ERP con la que se cobró (para "Nueva Venta"). */
  lista_precio_erp: number | null;
  /** Ya se subió el PDF del comprobante emitido en el ERP. */
  tiene_comprobante: boolean;
  /** Nombre original del PDF subido. */
  comprobante_nombre: string | null;
  /** Cuándo se envió el comprobante al cliente (null = guardado pero sin enviar). */
  comprobante_enviado_at: string | null;
  items: PagoAdminItem[];
}

/** Filtros del listado. Lo que viene vacío no se envía. */
export interface PagosEnLineaFiltros {
  search?: string;
  /** Por defecto el servidor devuelve solo las pagadas. */
  estado?: FiltroEstadoPago;
  /** Vacío = todas las etapas. */
  estado_proceso?: EstadoProcesoPago | '';
  page?: number;
  per_page?: number;
}

export interface PagosEnLineaPaginacion {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Cuántas compras pagadas hay en cada etapa. */
export type PagosEnLineaResumen = Record<EstadoProcesoPago, number>;

export interface PagosEnLineaListado {
  status: string;
  pagos: PagoAdmin[];
  pagination: PagosEnLineaPaginacion;
  resumen: PagosEnLineaResumen;
}

/** Lo que se guarda al dar seguimiento. El servidor reemplaza ambos textos. */
export interface SeguimientoPagoRequest {
  estado_proceso: EstadoProcesoPago;
  comprobante_erp?: string | null;
  notas_internas?: string | null;
}

export interface SeguimientoPagoResponse {
  status: string;
  message?: string;
  pago: PagoAdmin;
}

/** Lo que se manda al subir el comprobante. Los textos son opcionales. */
export interface SubirComprobanteRequest {
  archivo: File;
  /** Mensaje para el cliente (máx. 500). */
  mensaje?: string;
  /** N° del comprobante en el ERP (máx. 50): el mismo campo del seguimiento. */
  comprobante_erp?: string;
}

export interface ComprobantePagoResponse {
  status: string;
  message: string;
  /** Compra ya actualizada (el servidor pasa de "pendiente de facturar" a "facturado"). */
  pago: PagoAdmin;
}

export interface MensajeResponse {
  status: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagosEnLineaAdminService {
  private readonly baseUrl = `${environment.apiUrl}/pagos-en-linea`;

  constructor(private http: HttpClient) {}

  /** Compras en línea con filtros, paginación y conteo por etapa. */
  listar(filtros: PagosEnLineaFiltros = {}): Observable<PagosEnLineaListado> {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        params = params.set(clave, String(valor).trim());
      }
    });

    return this.http.get<PagosEnLineaListado>(this.baseUrl, { params });
  }

  /** Guarda la etapa, el comprobante del ERP y las notas internas. */
  actualizarSeguimiento(id: number, datos: SeguimientoPagoRequest): Observable<SeguimientoPagoResponse> {
    return this.http.patch<SeguimientoPagoResponse>(`${this.baseUrl}/${id}/seguimiento`, datos);
  }

  /** Vuelve a enviar al cliente el correo de confirmación de la compra (sin adjunto). */
  reenviar(id: number): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.baseUrl}/${id}/reenviar`, {});
  }

  /**
   * Sube el PDF del comprobante emitido en el ERP y lo envía al cliente.
   *
   * Va como multipart/form-data: no se fija el Content-Type a mano para que el
   * navegador agregue el `boundary`.
   */
  subirComprobante(id: number, datos: SubirComprobanteRequest): Observable<ComprobantePagoResponse> {
    const formulario = new FormData();
    formulario.append('archivo', datos.archivo, datos.archivo.name);
    if (datos.mensaje) formulario.append('mensaje', datos.mensaje);
    if (datos.comprobante_erp) formulario.append('comprobante_erp', datos.comprobante_erp);

    return this.http.post<ComprobantePagoResponse>(`${this.baseUrl}/${id}/comprobante`, formulario);
  }

  /** El PDF del comprobante ya subido (binario). */
  descargarComprobante(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/comprobante`, { responseType: 'blob' });
  }

  /** Vuelve a enviar al cliente el comprobante ya guardado. */
  reenviarComprobante(id: number): Observable<ComprobantePagoResponse> {
    return this.http.post<ComprobantePagoResponse>(`${this.baseUrl}/${id}/comprobante/reenviar`, {});
  }
}
