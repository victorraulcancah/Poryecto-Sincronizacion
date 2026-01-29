import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SunatErroresService {
  private apiUrl = `${environment.apiUrl}/sunat-errores`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todos los códigos de error
   */
  getAll(params?: {
    page?: number;
    categoria?: string;
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
   * Obtener categorías de errores
   */
  getCategorias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categorias`);
  }

  /**
   * Obtener estadísticas de errores
   */
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }

  /**
   * Buscar error por texto
   */
  buscar(params: {
    q: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('q', params.q);
    return this.http.get<any>(`${this.apiUrl}/buscar`, { params: httpParams });
  }

  /**
   * Parsear mensaje de SUNAT
   */
  parsear(data: {
    mensaje: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/parsear`, data);
  }

  /**
   * Obtener errores por categoría
   */
  getPorCategoria(categoria: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categoria/${categoria}`);
  }

  /**
   * Obtener código específico
   */
  getByCodigo(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${codigo}`);
  }
}
