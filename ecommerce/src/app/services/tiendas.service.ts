import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Tienda, CrearTiendaDto, ActualizarTiendaDto } from '../models/tienda.model';

@Injectable({
  providedIn: 'root'
})
export class TiendasService {
  private apiUrl = `${environment.apiUrl}/tiendas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Tienda[]> {
    return this.http.get<Tienda[]>(this.apiUrl);
  }

  ver(id: number): Observable<Tienda> {
    return this.http.get<Tienda>(`${this.apiUrl}/${id}`);
  }

  crear(data: CrearTiendaDto): Observable<Tienda> {
    return this.http.post<Tienda>(this.apiUrl, data);
  }

  actualizar(id: number, data: ActualizarTiendaDto): Observable<Tienda> {
    return this.http.put<Tienda>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
