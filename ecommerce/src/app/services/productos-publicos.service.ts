import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductosPublicosService {
  // Usar el backend de 7power para productos
  private apiUrl = `${environment.apiUrl7Power}/productos-publicos`;

  constructor(private http: HttpClient) {}

  /**
   * Listar productos públicos
   */
  getAll(params?: {
    page?: number;
    per_page?: number;
    categoria_id?: number;
    search?: string;
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
   * Ver detalle de producto
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener productos destacados
   */
  getDestacados(limit?: number): Observable<any> {
    let httpParams = new HttpParams();
    if (limit) {
      httpParams = httpParams.set('limit', limit.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/destacados`, { params: httpParams });
  }

  /**
   * Buscar productos
   */
  buscar(params: {
    q: string;
    categoria_id?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params] !== null && params[key as keyof typeof params] !== undefined) {
        httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/buscar`, { params: httpParams });
  }
}
