import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SincronizacionResponse {
  success: boolean;
  message: string;
  output?: string;
  timestamp?: string;
  error?: string;
}

export interface EstadoSincronizacion {
  success: boolean;
  data?: {
    marcas_sincronizadas: number;
    categorias_sincronizadas: number;
    ultima_actualizacion: string | null;
    estado: 'activo' | 'pendiente';
  };
}

@Injectable({
  providedIn: 'root'
})
export class SincronizacionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Ejecutar sincronización manual desde 7Power
   */
  sincronizarDesde7Power(): Observable<SincronizacionResponse> {
    return this.http.post<SincronizacionResponse>(`${this.apiUrl}/sincronizacion/7power`, {});
  }

  /**
   * Obtener estado de la sincronización
   */
  obtenerEstado(): Observable<EstadoSincronizacion> {
    return this.http.get<EstadoSincronizacion>(`${this.apiUrl}/sincronizacion/estado`);
  }
}
