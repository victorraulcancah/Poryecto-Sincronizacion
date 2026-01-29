import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExportacionesService {
  private apiUrl = `${environment.apiUrl}/contabilidad/exportar`;

  constructor(private http: HttpClient) {}

  /**
   * Exportar reporte de caja en PDF
   */
  exportarCajaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/caja/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Exportar reporte de caja en Excel
   */
  exportarCajaExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/caja/${id}/excel`, {
      responseType: 'blob'
    });
  }

  /**
   * Exportar kardex en PDF
   */
  exportarKardexPdf(productoId: number, params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params]);
    });
    return this.http.get(`${this.apiUrl}/kardex/${productoId}/pdf`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar kardex en Excel
   */
  exportarKardexExcel(productoId: number, params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params]);
    });
    return this.http.get(`${this.apiUrl}/kardex/${productoId}/excel`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar cuentas por cobrar en PDF
   */
  exportarCxCPdf(params?: {
    estado?: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params && params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    return this.http.get(`${this.apiUrl}/cxc/pdf`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar cuentas por cobrar en Excel
   */
  exportarCxCExcel(params?: {
    estado?: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params && params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    return this.http.get(`${this.apiUrl}/cxc/excel`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar utilidades en PDF
   */
  exportarUtilidadesPdf(params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params]);
    });
    return this.http.get(`${this.apiUrl}/utilidades/pdf`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar utilidades en Excel
   */
  exportarUtilidadesExcel(params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params]);
    });
    return this.http.get(`${this.apiUrl}/utilidades/excel`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar PLE SUNAT - Registro de Ventas (Formato 14.1)
   */
  exportarPLEVentas(data: { periodo: string; ruc: string }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/ple/registro-ventas`, data, {
      responseType: 'blob'
    });
  }

  /**
   * Exportar PLE SUNAT - Registro de Compras (Formato 8.1)
   */
  exportarPLECompras(data: { periodo: string; ruc: string }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/ple/registro-compras`, data, {
      responseType: 'blob'
    });
  }

  /**
   * Exportar Reporte de Ventas en TXT
   */
  exportarVentasTxt(params?: { fecha_inicio?: string; fecha_fin?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }

    return this.http.get(`${this.apiUrl}/ventas/txt`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Exportar Kardex de Producto en TXT
   */
  exportarKardexTxt(productoId: number, params?: { fecha_inicio?: string; fecha_fin?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.fecha_inicio) {
      httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    }
    if (params?.fecha_fin) {
      httpParams = httpParams.set('fecha_fin', params.fecha_fin);
    }

    return this.http.get(`${this.apiUrl}/kardex/${productoId}/txt`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Descargar archivo blob con nombre personalizado
   */
  descargarArchivo(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
