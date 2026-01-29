import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BajasService {
  private apiUrl = `${environment.apiUrl}/facturacion/bajas`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todas las comunicaciones de baja
   */
  getAll(params?: {
    estado?: string;
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
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  /**
   * Crear comunicación de baja
   */
  create(data: {
    comprobantes: Array<{
      tipo: string;
      serie: string;
      numero: number;
      motivo: string;
    }>;
    fecha_baja: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Obtener detalle de una baja
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Enviar baja a SUNAT
   */
  enviar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/enviar`, {});
  }

  /**
   * Consultar ticket de la baja
   */
  consultarTicket(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/ticket`);
  }

  /**
   * Descargar XML de la baja
   */
  descargarXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar CDR de la baja
   */
  descargarCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/cdr`, {
      responseType: 'blob'
    });
  }
}
