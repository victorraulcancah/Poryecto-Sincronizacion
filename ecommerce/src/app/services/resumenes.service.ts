import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResumenesService {
  private apiUrl = `${environment.apiUrl}/facturacion/resumenes`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todos los resúmenes diarios
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
   * Crear resumen diario
   */
  create(data: {
    fecha_resumen: string;
    comprobantes: Array<{
      id: number;
      serie: string;
      numero: number;
      tipo: string;
      cliente_tipo_doc: string;
      cliente_num_doc: string;
      moneda: string;
      total: number;
      igv: number;
      estado: string;
    }>;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Obtener detalle de un resumen
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Enviar resumen a SUNAT
   */
  enviar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/enviar`, {});
  }

  /**
   * Consultar ticket del resumen
   */
  consultarTicket(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/ticket`);
  }

  /**
   * Descargar XML del resumen
   */
  descargarXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar CDR del resumen
   */
  descargarCdr(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/cdr`, {
      responseType: 'blob'
    });
  }
}
