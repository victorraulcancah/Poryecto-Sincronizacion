import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CertificadosService {
  private apiUrl = `${environment.apiUrl}/facturacion/certificados`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todos los certificados
   */
  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  /**
   * Obtener un certificado específico
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Subir nuevo certificado
   */
  create(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  /**
   * Actualizar certificado
   */
  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Eliminar certificado
   */
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Activar certificado
   */
  activar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/activar`, {});
  }

  /**
   * Validar certificado
   */
  validar(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/validar`);
  }
}
