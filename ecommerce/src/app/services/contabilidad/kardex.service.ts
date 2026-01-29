import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface KardexMovimiento {
  id: number;
  producto_id: number;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  tipo_documento: string;
  numero_documento?: string;
  fecha: string;
  cantidad: number;
  costo_unitario: number;
  costo_total: number;
  saldo_cantidad: number;
  saldo_costo_unitario: number;
  saldo_costo_total: number;
  observaciones?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KardexService {
  private apiUrl = `${environment.apiUrl}/contabilidad/kardex`;

  constructor(private http: HttpClient) {}

  getKardexProducto(productoId: number, params?: { fecha_inicio?: string; fecha_fin?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if ((params as any)[key]) httpParams = httpParams.set(key, (params as any)[key]);
      });
    }
    return this.http.get(`${this.apiUrl}/producto/${productoId}`, { params: httpParams });
  }

  registrarAjuste(datos: {
    producto_id: number;
    cantidad: number;
    tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
    costo_unitario: number;
    observaciones?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/ajuste`, datos);
  }

  getInventarioValorizado(): Observable<any> {
    return this.http.get(`${this.apiUrl}/inventario-valorizado`);
  }
}
