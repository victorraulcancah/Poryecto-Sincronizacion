// src\app\services\reniec.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReniecResponse {
  success?: boolean;

  // Campos para DNI
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codVerifica?: number;
  codVerificaLetra?: string;

  // Campos para RUC
  ruc?: string;
  razonSocial?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;

  // Campos comunes
  nombre?: string;  // Campo combinado que devuelve el backend
  message?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ReniecService {

  private baseUrl = `${environment.apiUrl}` 

  constructor(private http: HttpClient) { }

  buscarPorDni(dni: string): Observable<ReniecResponse> {
    return this.http.get<ReniecResponse>(`${this.baseUrl}/reniec/buscar/${dni}`);
  }
}
