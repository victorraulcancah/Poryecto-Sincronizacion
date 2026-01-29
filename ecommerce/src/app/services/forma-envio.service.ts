// src/app/services/forma-envio.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FormaEnvio {
  id?: number;
  departamento_id: string;  // Código de 6 dígitos (ej: 150000)
  provincia_id?: string | null;  // Código de 6 dígitos (ej: 150100)
  distrito_id?: string | null;  // Código de 6 dígitos (ej: 150122)
  costo: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos adicionales de la vista
  departamento_nombre?: string;
  provincia_nombre?: string;
  distrito_nombre?: string;
  ubicacion_completa?: string;
}

export interface FormaEnvioResponse {
  success: boolean;
  message: string;
  forma_envio?: FormaEnvio;
  formas_envio?: FormaEnvio[];
}

export interface CostoEnvioRequest {
  departamento_id: string;
  provincia_id?: string;
  distrito_id?: string;
}

export interface CostoEnvioResponse {
  success: boolean;
  costo: number;
  forma_envio?: FormaEnvio;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormaEnvioService {
  private baseUrl = `${environment.apiUrl}/formas-envio`;

  constructor(private http: HttpClient) { }

  // Obtener todas las formas de envío
  obtenerTodas(): Observable<FormaEnvioResponse> {
    return this.http.get<FormaEnvioResponse>(this.baseUrl);
  }

  // Obtener solo las activas
  obtenerActivas(): Observable<FormaEnvioResponse> {
    return this.http.get<FormaEnvioResponse>(`${this.baseUrl}/activas`);
  }

  // Obtener una forma de envío por ID
  obtenerPorId(id: number): Observable<FormaEnvioResponse> {
    return this.http.get<FormaEnvioResponse>(`${this.baseUrl}/${id}`);
  }

  // ✅ NUEVO: Calcular costo de envío según ubicación
  calcularCostoEnvio(ubicacion: CostoEnvioRequest): Observable<CostoEnvioResponse> {
    return this.http.post<CostoEnvioResponse>(`${this.baseUrl}/calcular-costo`, ubicacion);
  }

  // ✅ NUEVO: Obtener formas de envío por departamento
  obtenerPorDepartamento(departamentoId: string): Observable<FormaEnvioResponse> {
    return this.http.get<FormaEnvioResponse>(`${this.baseUrl}/departamento/${departamentoId}`);
  }

  // Crear nueva forma de envío
  crear(data: Partial<FormaEnvio>): Observable<FormaEnvioResponse> {
    return this.http.post<FormaEnvioResponse>(this.baseUrl, data);
  }

  // Actualizar forma de envío
  actualizar(id: number, data: Partial<FormaEnvio>): Observable<FormaEnvioResponse> {
    return this.http.put<FormaEnvioResponse>(`${this.baseUrl}/${id}`, data);
  }

  // Eliminar forma de envío
  eliminar(id: number): Observable<FormaEnvioResponse> {
    return this.http.delete<FormaEnvioResponse>(`${this.baseUrl}/${id}`);
  }

  // Toggle estado activo/inactivo
  toggleEstado(id: number): Observable<FormaEnvioResponse> {
    return this.http.patch<FormaEnvioResponse>(`${this.baseUrl}/${id}/toggle-estado`, {});
  }
}
