// src/app/services/ubigeo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Departamento {
  id: string;
  nombre: string;
  id_ubigeo: string;  // Código de 6 dígitos (ej: 150000)
}

export interface Provincia {
  id: string;
  nombre: string;
  id_ubigeo: string;  // Código de 6 dígitos (ej: 150100)
}

export interface Distrito {
  id: string;
  nombre: string;
  id_ubigeo: string;  // Código de 6 dígitos (ej: 150122)
}

@Injectable({
  providedIn: 'root'
})
export class UbigeoService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getDepartamentos(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${this.baseUrl}/departamentos`);
  }

  getProvincias(departamentoId: string): Observable<Provincia[]> {
    return this.http.get<Provincia[]>(`${this.baseUrl}/provincias/${departamentoId}`);
  }

  getDistritos(departamentoId: string, provinciaId: string): Observable<Distrito[]> {
    return this.http.get<Distrito[]>(`${this.baseUrl}/distritos/${departamentoId}/${provinciaId}`);
  }

  getUbigeoChain(ubigeoId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ubigeo-chain/${ubigeoId}`);
  }
}
