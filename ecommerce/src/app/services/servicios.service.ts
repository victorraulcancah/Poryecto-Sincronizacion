import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Servicio, ServicioListResponse, ServicioResponse } from '../models/servicio.model';

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {
  private apiUrl = `${environment.apiUrl}/servicios`;

  constructor(private http: HttpClient) { }

  /**
   * Listar servicios con filtros opcionales
   */
  getServicios(filtros?: {
    search?: string;
    activo?: boolean;
    page?: number;
    per_page?: number;
  }): Observable<ServicioListResponse> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.search) params = params.set('search', filtros.search);
      if (filtros.activo !== undefined) params = params.set('activo', filtros.activo ? '1' : '0');
      if (filtros.page) params = params.set('page', filtros.page.toString());
      if (filtros.per_page) params = params.set('per_page', filtros.per_page.toString());
    }

    return this.http.get<ServicioListResponse>(this.apiUrl, { params });
  }

  /**
   * Obtener todos los servicios activos (sin paginación)
   */
  getServiciosActivos(): Observable<ServicioListResponse> {
    const params = new HttpParams().set('activo', '1').set('per_page', '1000');
    return this.http.get<ServicioListResponse>(this.apiUrl, { params });
  }

  /**
   * Obtener un servicio por ID
   */
  getServicio(id: number): Observable<ServicioResponse> {
    return this.http.get<ServicioResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo servicio
   */
  crearServicio(servicio: Partial<Servicio>): Observable<ServicioResponse> {
    return this.http.post<ServicioResponse>(this.apiUrl, servicio);
  }

  /**
   * Actualizar un servicio existente
   */
  actualizarServicio(id: number, servicio: Partial<Servicio>): Observable<ServicioResponse> {
    return this.http.put<ServicioResponse>(`${this.apiUrl}/${id}`, servicio);
  }

  /**
   * Eliminar un servicio
   */
  eliminarServicio(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Buscar servicios por nombre o código
   */
  buscarServicios(termino: string): Observable<{ success: boolean; data: Servicio[] }> {
    const params = new HttpParams().set('search', termino);
    return this.http.get<{ success: boolean; data: Servicio[] }>(`${this.apiUrl}/buscar`, { params });
  }
}
