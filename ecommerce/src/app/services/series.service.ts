import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeriesService {
  private apiUrl = `${environment.apiUrl}/series`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todas las series
   */
  getAll(params?: {
    tipo_comprobante?: string;
    estado?: string;
    sede_id?: number;
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
   * Obtener una serie específica
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nueva serie
   */
  create(data: {
    tipo_comprobante: string;
    serie: string;
    correlativo_inicial: number;
    sede_id: number;
    caja_id?: number;
    estado: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Actualizar serie
   */
  update(id: number, data: {
    estado?: string;
    sede_id?: number;
  }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Reservar correlativo
   */
  reservarCorrelativo(data: {
    serie_id: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reservar-correlativo`, data);
  }

  /**
   * Obtener estadísticas de series
   */
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }
}
