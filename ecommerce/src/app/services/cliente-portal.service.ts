import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
}
