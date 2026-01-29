import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CuentaPorPagar {
  id: number;
  proveedor_id: number;
  proveedor?: any;
  numero_documento: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_total: number;
  monto_pagado: number;
  saldo: number;
  moneda: string;
  descripcion: string;
  observaciones?: string;
  estado: string;
  dias_credito: number;
  created_at?: string;
  updated_at?: string;
}

export interface CxPPago {
  id: number;
  cuenta_por_pagar_id: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  banco?: string;
  numero_operacion?: string;
  observaciones?: string;
  created_at?: string;
}

export interface CxPFormData {
  proveedor_id: number;
  numero_documento: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_total: number;
  moneda: string;
  descripcion: string;
  observaciones?: string;
}

export interface CxPPagoFormData {
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  banco?: string;
  numero_operacion?: string;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CuentasPorPagarService {
  private apiUrl = `${environment.apiUrl}/contabilidad/cuentas-por-pagar`;

  constructor(private http: HttpClient) {}

  /**
   * Listar cuentas por pagar con filtros
   */
  getCuentas(params?: {
    proveedor_id?: number;
    estado?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    per_page?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  /**
   * Obtener una cuenta por pagar específica
   */
  getCuenta(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nueva cuenta por pagar
   */
  crear(data: CxPFormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Actualizar cuenta por pagar
   */
  actualizar(id: number, data: Partial<CxPFormData>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Eliminar cuenta por pagar
   */
  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Registrar pago de cuenta por pagar
   */
  registrarPago(id: number, data: CxPPagoFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/pago`, data);
  }

  /**
   * Obtener pagos de una cuenta
   */
  getPagos(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/pagos`);
  }

  /**
   * Obtener antigüedad de saldos
   */
  getAntiguedadSaldos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/antiguedad-saldos`);
  }

  /**
   * Obtener estadísticas de CxP
   */
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }
}
