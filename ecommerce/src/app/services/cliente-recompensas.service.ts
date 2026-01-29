import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClienteRecompensasService {
  private clienteApiUrl = `${environment.apiUrl}/cliente/recompensas`;

  constructor(private http: HttpClient) {}

  obtenerRecompensasActivas(tipo?: string): Observable<any> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<any>(`${this.clienteApiUrl}/activas`, { params });
  }

  obtenerPuntos(): Observable<any> {
    return this.http.get<any>(`${this.clienteApiUrl}/puntos`);
  }
}


