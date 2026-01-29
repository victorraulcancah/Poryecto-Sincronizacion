import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FacturasManualesService {
  private apiUrl = `${environment.apiUrl}/facturas`;

  constructor(private http: HttpClient) {}

  /**
   * Listar facturas manuales
   */
  getAll(params?: {
    tipo_comprobante?: string;
    estado?: string;
    cliente_id?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== null && params[key as keyof typeof params] !== undefined) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  /**
   * Crear factura/boleta manual
   */
  create(data: {
    cliente_id: number;
    tipo_comprobante: string;
    serie_id: number;
    fecha_emision: string;
    productos: Array<{
      producto_id: number;
      cantidad: number;
      precio_unitario: number;
      descuento?: number;
    }>;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Obtener detalle de factura
   */
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Enviar factura a SUNAT
   */
  enviarSunat(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/enviar-sunat`, {});
  }

  /**
   * Descargar PDF
   */
  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Descargar XML
   */
  descargarXml(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  /**
   * Buscar productos para facturación
   */
  buscarProductos(params: {
    search: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('search', params.search);
    return this.http.get<any>(`${this.apiUrl}/buscar-productos`, { params: httpParams });
  }

  /**
   * Obtener clientes
   */
  getClientes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clientes`);
  }

  /**
   * Obtener series disponibles
   */
  getSeries(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/series`);
  }

  /**
   * Obtener estadísticas
   */
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }
}
