import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipoPago {
  id?: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  icono?: string;
  activo: boolean;
  orden: number;
  created_at?: string;
  updated_at?: string;
}

export interface TipoPagoResponse {
  status: string;
  tipos_pago: TipoPago[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TipoPagoService {
  private apiUrl = `${environment.apiUrl}/tipos-pago`;

  constructor(private http: HttpClient) { }

  // Obtener todos los tipos de pago (admin)
  obtenerTodos(): Observable<TipoPagoResponse> {
    return this.http.get<TipoPagoResponse>(this.apiUrl);
  }

  // Obtener solo tipos de pago activos (público)
  obtenerActivos(): Observable<TipoPagoResponse> {
    return this.http.get<TipoPagoResponse>(`${this.apiUrl}/activos`);
  }

  // Crear tipo de pago
  crear(tipoPago: TipoPago): Observable<any> {
    return this.http.post(this.apiUrl, tipoPago);
  }

  // Actualizar tipo de pago
  actualizar(id: number, tipoPago: TipoPago): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, tipoPago);
  }

  // Toggle estado
  toggleEstado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-estado`, {});
  }

  // Eliminar
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
