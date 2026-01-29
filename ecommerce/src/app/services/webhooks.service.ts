import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebhooksService {
  private apiUrl = `${environment.apiUrl}/webhook`;

  constructor(private http: HttpClient) {}

  /**
   * Webhook genérico de pago
   */
  procesarPago(data: {
    compra_id: number;
    monto: number;
    metodo_pago: string;
    referencia_pago: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/pago`, data);
  }

  /**
   * Webhook específico de Culqi
   */
  procesarCulqi(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/culqi`, data);
  }
}
