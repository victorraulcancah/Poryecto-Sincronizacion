import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipoPrecio {
  id: number;
  nombre: string;
  tipo_moneda: string; // 's' | 'd'
  activo: boolean;
  es_predeterminado: boolean;
  es_para_invitados: boolean;
  productos_count: number;
}

export interface TiposPrecioResponse {
  status: string;
  tipos_precio: TipoPrecio[];
}

@Injectable({ providedIn: 'root' })
export class TiposPrecioService {
  private apiUrl = `${environment.apiUrl}/tipos-precio`;

  constructor(private http: HttpClient) {}

  listar(): Observable<TiposPrecioResponse> {
    return this.http.get<TiposPrecioResponse>(this.apiUrl);
  }

  toggleActivo(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-activo`, {});
  }

  marcarPredeterminado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/predeterminado`, {});
  }

  marcarInvitados(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/invitados`, {});
  }

  quitarInvitados(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/quitar-invitados`, {});
  }
}
