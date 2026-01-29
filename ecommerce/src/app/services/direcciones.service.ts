import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Direccion {
  id: number;
  nombre_destinatario: string;
  direccion_completa: string;
  id_ubigeo: string; // Cambiado de ubigeo_id a id_ubigeo
  telefono?: string;
  predeterminada: boolean;
  activa: boolean;
  ubigeo?: {
    id_ubigeo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    // Nuevos campos con nombres
    departamento_nombre: string;
    provincia_nombre: string;
    distrito_nombre: string;
  };
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DireccionesService {
  private baseUrl = `${environment.apiUrl}/mis-direcciones`;

  constructor(private http: HttpClient) {}

  obtenerDirecciones(): Observable<{status: string, direcciones: Direccion[]}> {
    console.log('Obteniendo direcciones desde:', `${this.baseUrl}`);
    return this.http.get<{status: string, direcciones: Direccion[]}>(`${this.baseUrl}`);
  }

  crearDireccion(direccion: Partial<Direccion>): Observable<any> {
    console.log('Creando dirección:', direccion);
    return this.http.post(`${this.baseUrl}`, direccion);
  }

  actualizarDireccion(id: number, direccion: Partial<Direccion>): Observable<any> {
    console.log('Actualizando dirección:', { id, direccion });
    return this.http.put(`${this.baseUrl}/${id}`, direccion);
  }

  eliminarDireccion(id: number): Observable<any> {
    console.log('Eliminando dirección:', id);
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  establecerPredeterminada(id: number): Observable<any> {
    console.log('Estableciendo dirección como predeterminada:', id);
    return this.http.patch(`${this.baseUrl}/${id}/predeterminada`, {});
  }
}