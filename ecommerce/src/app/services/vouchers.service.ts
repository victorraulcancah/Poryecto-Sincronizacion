import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Voucher {
  id: number;
  venta_id: number;
  cliente_id: number;
  tipo_pago: string;
  monto: number;
  fecha_pago: string;
  numero_operacion?: string;
  banco?: string;
  imagen_url: string;
  estado: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';
  verificado_por?: number;
  fecha_verificacion?: string;
  observaciones?: string;
  motivo_rechazo?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VouchersService {
  private apiUrl = `${environment.apiUrl}/contabilidad/vouchers`;

  constructor(private http: HttpClient) {}

  getVouchers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(this.apiUrl, { params: httpParams });
  }

  getVoucher(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  subirVoucher(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  verificarVoucher(id: number, datos?: { observaciones?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/verificar`, datos || {});
  }

  rechazarVoucher(id: number, datos: { motivo_rechazo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/rechazar`, datos);
  }

  getEstadisticas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas`);
  }
}
