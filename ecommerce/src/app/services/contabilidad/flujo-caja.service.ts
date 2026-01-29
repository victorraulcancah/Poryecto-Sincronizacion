import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Proyeccion as ProyeccionFlujoCaja,
  CrearProyeccionDto,
  RegistrarRealDto,
  Comparativa as ComparativaFlujoCaja,
  Alerta as AlertaDesviacion
} from '../../models/contabilidad/flujo-caja.model';

@Injectable({
  providedIn: 'root'
})
export class FlujoCajaService {
  private apiUrl = `${environment.apiUrl}/contabilidad/flujo-caja`;

  constructor(private http: HttpClient) {}

  // ==================== PROYECCIONES ====================

  /**
   * 3.1 Listar Proyecciones
   * GET /flujo-caja
   */
  listar(params?: { fecha_inicio?: string; fecha_fin?: string; tipo?: 'INGRESO' | 'EGRESO' }): Observable<ProyeccionFlujoCaja[]> {
    let httpParams = new HttpParams();
    
    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }
    if (params?.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }
    
    return this.http.get<ProyeccionFlujoCaja[]>(this.apiUrl, { params: httpParams });
  }

  /**
   * 3.2 Crear Proyección
   * POST /flujo-caja
   */
  crear(data: CrearProyeccionDto): Observable<ProyeccionFlujoCaja> {
    return this.http.post<ProyeccionFlujoCaja>(this.apiUrl, data);
  }

  /**
   * 3.3 Ver Detalle
   * GET /flujo-caja/{id}
   */
  ver(id: number): Observable<ProyeccionFlujoCaja> {
    return this.http.get<ProyeccionFlujoCaja>(`${this.apiUrl}/${id}`);
  }

  /**
   * 3.4 Actualizar
   * PUT /flujo-caja/{id}
   */
  actualizar(id: number, data: Partial<CrearProyeccionDto>): Observable<ProyeccionFlujoCaja> {
    return this.http.put<ProyeccionFlujoCaja>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * 3.5 Eliminar
   * DELETE /flujo-caja/{id}
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * 3.6 Registrar Monto Real
   * POST /flujo-caja/{id}/real
   */
  registrarReal(id: number, data: RegistrarRealDto): Observable<ProyeccionFlujoCaja> {
    return this.http.post<ProyeccionFlujoCaja>(`${this.apiUrl}/${id}/real`, data);
  }

  /**
   * 3.7 Comparativa Proyectado vs Real
   * GET /flujo-caja/comparativa
   */
  comparativa(fechaInicio?: string, fechaFin?: string): Observable<ComparativaFlujoCaja> {
    let params = new HttpParams();
    
    if (fechaInicio) {
      params = params.set('fecha_inicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fecha_fin', fechaFin);
    }
    
    return this.http.get<ComparativaFlujoCaja>(`${this.apiUrl}/comparativa`, { params });
  }

  /**
   * 3.8 Alertas de Desviación
   * GET /flujo-caja/alertas
   */
  alertas(fechaInicio?: string, fechaFin?: string): Observable<{
    total_alertas: number;
    criticas: number;
    moderadas: number;
    alertas: AlertaDesviacion[];
  }> {
    let params = new HttpParams();
    
    if (fechaInicio) {
      params = params.set('fecha_inicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fecha_fin', fechaFin);
    }
    
    return this.http.get<{
      total_alertas: number;
      criticas: number;
      moderadas: number;
      alertas: AlertaDesviacion[];
    }>(`${this.apiUrl}/alertas`, { params });
  }
}
