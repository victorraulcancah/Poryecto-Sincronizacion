import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReintentosService {
  private apiUrl = `${environment.apiUrl}/facturacion/reintentos`;

  constructor(private http: HttpClient) {}

  /**
   * Listar cola de reintentos
   */
  getAll(params?: {
    estado?: string;
    proximo_reintento_desde?: string;
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
   * Reintentar operación específica
   */
  reintentar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reintentar`, {});
  }

  /**
   * Reintentar todas las operaciones pendientes
   */
  reintentarTodo(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reintentar-todo`, {});
  }

  /**
   * Cancelar reintento
   */
  cancelar(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/cancelar`, {});
  }
}
