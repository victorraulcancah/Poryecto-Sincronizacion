import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportesContablesService {
  private apiUrl = `${environment.apiUrl}/contabilidad/reportes`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener ventas diarias
   */
  getVentasDiarias(params: {
    fecha: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('fecha', params.fecha);
    return this.http.get<any>(`${this.apiUrl}/ventas-diarias`, { params: httpParams });
  }

  /**
   * Obtener ventas mensuales
   */
  getVentasMensuales(params: {
    mes: number;
    anio: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params].toString());
    });
    return this.http.get<any>(`${this.apiUrl}/ventas-mensuales`, { params: httpParams });
  }

  /**
   * Obtener productos más vendidos
   */
  getProductosMasVendidos(params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params]);
    });
    return this.http.get<any>(`${this.apiUrl}/productos-mas-vendidos`, { params: httpParams });
  }

  /**
   * Obtener rentabilidad por producto
   */
  getRentabilidadProductos(params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      httpParams = httpParams.set(key, params[key as keyof typeof params]);
    });
    return this.http.get<any>(`${this.apiUrl}/rentabilidad-productos`, { params: httpParams });
  }

  /**
   * Obtener dashboard financiero
   */
  getDashboardFinanciero(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard-financiero`);
  }
}
