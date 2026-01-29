import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Caja,
  Tienda,
  MovimientoCaja,
  Transaccion,
  EstadoCaja,
  TransaccionesResponse,
  ReporteCaja,
  ResultadoCierre,
  CrearCajaDto,
  ActualizarCajaDto,
  AperturarCajaDto,
  CerrarCajaDto,
  RegistrarTransaccionDto
} from '../../models/contabilidad/caja.model';

@Injectable({
  providedIn: 'root'
})
export class CajasService {
  private apiUrl = `${environment.apiUrl}/contabilidad/cajas`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD CAJAS ====================

  /**
   * Listar todas las cajas
   * GET /contabilidad/cajas
   */
  listar(): Observable<Caja[]> {
    return this.http.get<Caja[]>(this.apiUrl);
  }

  /**
   * Ver detalle de una caja
   * GET /contabilidad/cajas/{id}
   */
  ver(id: number): Observable<Caja> {
    return this.http.get<Caja>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nueva caja
   * POST /contabilidad/cajas
   */
  crear(data: CrearCajaDto): Observable<Caja> {
    return this.http.post<Caja>(this.apiUrl, data);
  }

  /**
   * Actualizar caja
   * PUT /contabilidad/cajas/{id}
   */
  actualizar(id: number, data: ActualizarCajaDto): Observable<Caja> {
    return this.http.put<Caja>(`${this.apiUrl}/${id}`, data);
  }

  // ==================== ESTADO ====================

  /**
   * Obtener cajas abiertas
   * GET /contabilidad/cajas/abiertas
   */
  obtenerAbiertas(): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${this.apiUrl}/abiertas`);
  }

  /**
   * Obtener estado actual de una caja
   * GET /contabilidad/cajas/{id}/estado
   */
  obtenerEstado(id: number): Observable<EstadoCaja> {
    return this.http.get<EstadoCaja>(`${this.apiUrl}/${id}/estado`);
  }

  // ==================== OPERACIONES ====================

  /**
   * Aperturar caja
   * POST /contabilidad/cajas/{id}/aperturar
   */
  aperturar(id: number, data: AperturarCajaDto): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(`${this.apiUrl}/${id}/aperturar`, data);
  }

  /**
   * Cerrar caja
   * POST /contabilidad/cajas/{id}/cerrar
   */
  cerrar(id: number, data: CerrarCajaDto): Observable<ResultadoCierre> {
    return this.http.post<ResultadoCierre>(`${this.apiUrl}/${id}/cerrar`, data);
  }

  // ==================== TRANSACCIONES ====================

  /**
   * Registrar transacción
   * POST /contabilidad/cajas/{id}/transacciones
   */
  registrarTransaccion(cajaId: number, data: RegistrarTransaccionDto): Observable<Transaccion> {
    return this.http.post<Transaccion>(`${this.apiUrl}/${cajaId}/transacciones`, data);
  }

  /**
   * Obtener transacciones de una caja
   * GET /contabilidad/cajas/{id}/transacciones
   */
  obtenerTransacciones(cajaId: number): Observable<TransaccionesResponse> {
    return this.http.get<TransaccionesResponse>(`${this.apiUrl}/${cajaId}/transacciones`);
  }

  /**
   * Anular transacción
   * DELETE /contabilidad/cajas/{id}/transacciones/{txId}
   */
  anularTransaccion(cajaId: number, transaccionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cajaId}/transacciones/${transaccionId}`);
  }

  // ==================== REPORTES ====================

  /**
   * Obtener reporte de caja
   * GET /contabilidad/cajas/{id}/reporte
   */
  obtenerReporte(cajaId: number): Observable<ReporteCaja> {
    return this.http.get<ReporteCaja>(`${this.apiUrl}/${cajaId}/reporte`);
  }

  // ==================== UTILIDADES ====================

  /**
   * Obtener lista de tiendas disponibles
   * (Asumiendo que existe este endpoint o usar otro servicio)
   */
  obtenerTiendas(): Observable<Tienda[]> {
    // Ajustar según tu API
    return this.http.get<Tienda[]>(`${environment.apiUrl}/tiendas`);
  }
}
