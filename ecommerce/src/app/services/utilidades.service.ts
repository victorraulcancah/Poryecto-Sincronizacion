import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RucData {
  ruc: string;
  razon_social: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  fuente?: string;
}

export interface DniData {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

@Injectable({
  providedIn: 'root'
})
export class UtilidadesService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  /**
   * Validar RUC en SUNAT
   */
  validarRuc(ruc: string): Observable<{ success: boolean; data?: RucData; message?: string }> {
    return this.http.post<{ success: boolean; data?: RucData; message?: string }>(
      `${this.apiUrl}/utilidades/validar-ruc/${ruc}`,
      {}
    );
  }

  /**
   * Buscar empresa por RUC (alias de validarRuc)
   */
  buscarEmpresa(ruc: string): Observable<{ success: boolean; data?: RucData; message?: string }> {
    return this.http.get<{ success: boolean; data?: RucData; message?: string }>(
      `${this.apiUrl}/utilidades/buscar-empresa/${ruc}`
    );
  }

  /**
   * Validar DNI en RENIEC
   */
  validarDni(dni: string): Observable<{ success: boolean; data?: DniData; error?: string }> {
    return this.http.post<{ success: boolean; data?: DniData; error?: string }>(
      `${this.apiUrl}/validacion/dni`,
      { dni }
    );
  }
}
