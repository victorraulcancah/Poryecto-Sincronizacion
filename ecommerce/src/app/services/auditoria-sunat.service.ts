import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaSunatService {
  private apiUrl = `${environment.apiUrl}/facturacion/auditoria`;

  constructor(private http: HttpClient) {}

  /**
   * Listar auditoría de operaciones SUNAT
   */
  getAll(params?: {
    tipo_operacion?: string;
    exitoso?: boolean;
    desde?: string;
    hasta?: string;
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
   * Obtener detalle de una auditoría
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
