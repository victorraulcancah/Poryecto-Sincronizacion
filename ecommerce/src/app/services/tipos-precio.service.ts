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
  categoria: 'visitante' | 'vinculado';
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

  // Pestaña "Clientes visitantes": activa/desactiva como LA lista elegida para su moneda.
  toggleVisitante(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-visitante`, {});
  }

  // Pestaña "Clientes vinculados": activa/desactiva como opción disponible.
  toggleVinculado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-vinculado`, {});
  }

  // Botón "Actualizar listas desde Novik" (dentro del modal Agregar Lista).
  resincronizar(): Observable<any> {
    return this.http.post(`${this.apiUrl}/resincronizar`, {});
  }

  // Modal "Agregar Lista de Precio" — pestaña Clientes visitantes (máx. 1 soles + 1 dólares).
  asignarVisitantes(solesId: number | null, dolaresId: number | null): Observable<any> {
    return this.http.post(`${this.apiUrl}/asignar-visitantes`, { soles_id: solesId, dolares_id: dolaresId });
  }

  // Modal "Agregar Lista de Precio" — pestaña Clientes vinculados (cualquier cantidad).
  asignarVinculados(ids: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/asignar-vinculados`, { ids });
  }
}
