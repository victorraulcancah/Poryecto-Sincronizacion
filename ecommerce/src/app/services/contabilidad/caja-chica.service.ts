import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ==================== INTERFACES ====================

export interface CajaChica {
  id: number;
  nombre: string;
  codigo: string;
  fondo_fijo: number;
  saldo_actual: number;
  responsable_id: number;
  responsable?: any;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GastoCajaChica {
  id: number;
  caja_chica_id: number;
  fecha: string;
  monto: number;
  categoria: 'VIATICOS' | 'UTILES_OFICINA' | 'SERVICIOS' | 'MANTENIMIENTO' | 'TRANSPORTE' | 'OTROS';
  descripcion: string;
  comprobante_tipo?: string;
  comprobante_numero?: string;
  proveedor?: string;
  archivo_adjunto?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  user_id: number;
  user?: any;
  aprobado_por?: number;
  aprobado_at?: string;
  observaciones?: string;
  created_at?: string;
}

export interface CrearCajaChicaDto {
  nombre: string;
  fondo_fijo: number;
  responsable_id: number;
  activo?: boolean;
}

export interface RegistrarGastoDto {
  fecha: string;
  monto: number;
  categoria: 'VIATICOS' | 'UTILES_OFICINA' | 'SERVICIOS' | 'MANTENIMIENTO' | 'TRANSPORTE' | 'OTROS';
  descripcion: string;
  comprobante_tipo?: string;
  comprobante_numero?: string;
  proveedor?: string;
  archivo_adjunto?: File;
}

export interface AprobarGastoDto {
  estado: 'APROBADO' | 'RECHAZADO';
  observaciones?: string;
}

export interface SaldoCajaChica {
  caja_id: number;
  nombre: string;
  fondo_fijo: number;
  saldo_actual: number;
  porcentaje_disponible: number;
}

@Injectable({
  providedIn: 'root'
})
export class CajaChicaService {
  private apiUrl = `${environment.apiUrl}/contabilidad/caja-chica`;

  constructor(private http: HttpClient) {}

  // ==================== CAJAS CHICAS ====================

  /**
   * 2.1 Listar Cajas Chicas
   * GET /caja-chica
   */
  listar(): Observable<CajaChica[]> {
    return this.http.get<CajaChica[]>(this.apiUrl);
  }

  /**
   * 2.2 Crear Caja Chica
   * POST /caja-chica
   * Código generado automáticamente (CCH-001, CCH-002...)
   */
  crear(data: CrearCajaChicaDto): Observable<CajaChica> {
    return this.http.post<CajaChica>(this.apiUrl, data);
  }

  /**
   * 2.3 Ver Detalle
   * GET /caja-chica/{id}
   */
  ver(id: number): Observable<CajaChica> {
    return this.http.get<CajaChica>(`${this.apiUrl}/${id}`);
  }

  /**
   * 2.4 Saldo Disponible
   * GET /caja-chica/{id}/saldo
   */
  saldo(id: number): Observable<SaldoCajaChica> {
    return this.http.get<SaldoCajaChica>(`${this.apiUrl}/${id}/saldo`);
  }

  /**
   * 2.5 Registrar Gasto
   * POST /caja-chica/{id}/gastos
   * Acepta multipart/form-data para archivo adjunto
   */
  registrarGasto(cajaChicaId: number, data: FormData): Observable<GastoCajaChica> {
    return this.http.post<GastoCajaChica>(`${this.apiUrl}/${cajaChicaId}/gastos`, data);
  }

  /**
   * 2.6 Listar Gastos
   * GET /caja-chica/{id}/gastos
   */
  listarGastos(cajaChicaId: number): Observable<GastoCajaChica[]> {
    return this.http.get<GastoCajaChica[]>(`${this.apiUrl}/${cajaChicaId}/gastos`);
  }

  /**
   * 2.7 Editar Gasto
   * PUT /caja-chica/gastos/{gastoId}
   * Solo gastos con estado PENDIENTE
   */
  editarGasto(gastoId: number, data: Partial<RegistrarGastoDto>): Observable<GastoCajaChica> {
    return this.http.put<GastoCajaChica>(`${this.apiUrl}/gastos/${gastoId}`, data);
  }

  /**
   * 2.8 Aprobar/Rechazar Gasto
   * POST /caja-chica/gastos/{gastoId}/aprobar
   */
  aprobarGasto(gastoId: number, data: AprobarGastoDto): Observable<GastoCajaChica> {
    return this.http.post<GastoCajaChica>(`${this.apiUrl}/gastos/${gastoId}/aprobar`, data);
  }

  /**
   * 2.9 Gastos Pendientes
   * GET /caja-chica/gastos-pendientes
   */
  gastosPendientes(): Observable<GastoCajaChica[]> {
    return this.http.get<GastoCajaChica[]>(`${this.apiUrl}/gastos-pendientes`);
  }

  /**
   * 2.10 Reposición de Fondo
   * POST /caja-chica/{id}/reposicion
   */
  reposicion(id: number, data: { monto: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reposicion`, data);
  }

  /**
   * 2.11 Rendición
   * GET /caja-chica/{id}/rendicion
   */
  rendicion(id: number, fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    
    if (fechaInicio) {
      params = params.set('fecha_inicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.set('fecha_fin', fechaFin);
    }
    
    return this.http.get(`${this.apiUrl}/${id}/rendicion`, { params });
  }
}
