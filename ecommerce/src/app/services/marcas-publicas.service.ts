import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MarcasPublicasService {
  // Usar el backend de 7power para marcas
  private apiUrl = `${environment.apiUrl7Power}/marcas-publicas`;

  constructor(private http: HttpClient) {}

  /**
   * Listar marcas públicas
   */
  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  /**
   * Ver detalle de marca
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
