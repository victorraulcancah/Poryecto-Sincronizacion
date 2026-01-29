import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComprobantesService {
  private apiUrl = `${environment.apiUrl}/comprobantes`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todos los comprobantes con filtros
   */
  getAll(params?: {
    tipo_comprobante?: string;
    estado?: string;
    cliente_id?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== null && params[key as keyof typeof params] !== undefined) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  /**
   * Obtener estadísticas de comprobantes
   */
  getEstadisticas(params?: {
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
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { params: httpParams });
  }

  /**
   * Obtener detalle de un comprobante
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Reenviar comprobante a SUNAT
   */
  reenviar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reenviar`, {});
  }

  /**
   * Consultar estado en SUNAT
   */
  consultar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/consultar`, {});
  }

  /**
   * Descargar PDF del comprobante
   */
  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar XML del comprobante
   */
  descargarXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar CDR del comprobante
   */
  descargarCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/cdr`, {
      responseType: 'blob'
    });
  }

  /**
   * Enviar comprobante por email
   */
  enviarEmail(id: number, data: {
    to: string;
    asunto?: string;
    mensaje?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/email`, data);
  }

  /**
   * Anular comprobante
   */
  anular(id: number, data: {
    motivo: string;
  }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/anular`, data);
  }
}
