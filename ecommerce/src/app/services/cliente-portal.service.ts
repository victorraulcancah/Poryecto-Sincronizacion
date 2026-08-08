import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Titular a nombre de quien se emite el comprobante. */
export interface TitularCheckout {
  /** true si la cuenta está vinculada a un cliente de 7Power. */
  vinculado: boolean;
  origen: 'erp' | 'ecommerce';
  codigo_erp?: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
}

/** TC comercial del ERP: interbancario de Bloomberg más el margen de la empresa. */
export interface TipoCambioComercial {
  /** false si el ERP todavía no tiene ningún valor registrado. */
  disponible: boolean;
  valor_fuente?: number;
  fuente?: string;
  fecha_fuente?: string;
  margen?: number;
  /** El que se muestra al cliente: valor_fuente + margen. */
  valor_final?: number;
  actualizado_en?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClientePortalService {
  private apiUrl = `${environment.apiUrl}/cliente`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener mis comprobantes
   */
  getMisComprobantes(params?: {
    tipo_comprobante?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params]) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/mis-comprobantes`, { params: httpParams });
  }

  /**
   * Ver detalle de comprobante
   */
  getComprobanteDetalle(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mis-comprobantes/${id}`);
  }

  /**
   * Descargar PDF de comprobante
   */
  descargarComprobantePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/mis-comprobantes/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar XML de comprobante
   */
  descargarComprobanteXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/mis-comprobantes/${id}/xml`, {
      responseType: 'blob'
    });
  }

  /**
   * Reenviar comprobante por email
   */
  reenviarComprobante(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mis-comprobantes/${id}/reenviar`, {});
  }

  /**
   * Obtener mis ventas
   */
  getMisVentas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mis-ventas`);
  }

  /**
   * Obtener mis cuentas por cobrar
   */
  getMisCuentas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mis-cuentas`);
  }

  /**
   * Descargar estado de cuenta en PDF
   */
  descargarEstadoCuenta(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/estado-cuenta/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Crédito disponible del cliente (vinculado al ERP), refrescado en vivo.
   * Usado en el paso de pago del checkout.
   */
  getCredito(): Observable<{ vinculado: boolean; credito_disponible: number }> {
    return this.http.get<{ vinculado: boolean; credito_disponible: number }>(`${this.apiUrl}/credito`);
  }

  /**
   * Datos del titular para el paso de pago del checkout: los del cliente de
   * 7Power si la cuenta está vinculada, o los del usuario registrado si no.
   */
  getTitular(): Observable<TitularCheckout> {
    return this.http.get<TitularCheckout>(`${this.apiUrl}/titular`);
  }

  /**
   * TC comercial de la empresa, el mismo que usa Nueva Venta del ERP
   * (interbancario de Bloomberg + margen). Sale de la base de 7Power.
   */
  getTipoCambio(): Observable<TipoCambioComercial> {
    return this.http.get<TipoCambioComercial>(`${this.apiUrl}/tipo-cambio`);
  }
}
