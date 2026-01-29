// src\app\services\cliente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Cliente, 
  ClientesResponse, 
  ClienteDetalle, 
  ClientesFiltros, 
  EstadisticasGenerales 
} from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = `${environment.apiUrl}/clientes`;
  constructor(private http: HttpClient) { }

  getClientes(filtros: ClientesFiltros = {}): Observable<ClientesResponse> {
    let params = new HttpParams();
    
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.estado !== undefined && filtros.estado !== '') {
      params = params.set('estado', filtros.estado.toString());
    }
    if (filtros.tipo_login) params = params.set('tipo_login', filtros.tipo_login);
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.per_page) params = params.set('per_page', filtros.per_page.toString());
    if (filtros.page) params = params.set('page', filtros.page.toString());

    return this.http.get<ClientesResponse>(this.apiUrl, { params });
  }

  getCliente(id: number): Observable<{status: string, data: ClienteDetalle}> {
    return this.http.get<{status: string, data: ClienteDetalle}>(`${this.apiUrl}/${id}`);
  }

  updateCliente(id: number, cliente: Partial<Cliente>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, cliente);
  }

  toggleEstado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-estado`, {});
  }

  deleteCliente(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getEstadisticas(): Observable<{status: string, data: EstadisticasGenerales}> {
    return this.http.get<{status: string, data: EstadisticasGenerales}>(`${this.apiUrl}/estadisticas`);
  }

  // Buscar cliente por número de documento (DNI o RUC)
  // Usa el endpoint GET /api/clientes/buscar-por-documento?numero_documento={doc}
  // Devuelve: { success: true, data: [cliente] } o { success: false, data: [] }
  buscarPorDocumento(numeroDocumento: string): Observable<{
    success: boolean;
    data: Array<{
      id_cliente: number;
      nombres: string;
      apellidos: string;
      nombre_completo: string;
      email: string;
      telefono: string;
      numero_documento: string;
      direccion: string | null;
      estado: boolean;
    }>;
    message?: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/buscar-por-documento`, {
      params: { numero_documento: numeroDocumento }
    });
  }
}
