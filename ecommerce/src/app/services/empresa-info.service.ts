// src/services/empresa-info.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmpresaInfo, EmpresaInfoCreate } from '../types/empresa-info.types';

@Injectable({
  providedIn: 'root',
})
export class EmpresaInfoService {
  private apiUrl = `${environment.apiUrl}`;
  private baseUrl = environment.apiUrl.replace('/api', '');

  constructor(private http: HttpClient) {}

  // Obtener información de la empresa
  obtenerEmpresaInfo(): Observable<EmpresaInfo> {
    return this.http.get<{ success: boolean; data: EmpresaInfo }>(`${this.apiUrl}/empresa-info`).pipe(
      map((response) => ({
        ...response.data,
        logo_url: response.data.logo
          ? `${this.baseUrl}/storage/${response.data.logo}`
          : undefined,
      }))
    );
  }

  // Crear información de empresa
  crearEmpresaInfo(empresaInfo: EmpresaInfoCreate): Observable<any> {
    const formData = new FormData();

    formData.append('nombre_empresa', empresaInfo.nombre_empresa);
    formData.append('ruc', empresaInfo.ruc);
    formData.append('razon_social', empresaInfo.razon_social);
    formData.append('direccion', empresaInfo.direccion);

    if (empresaInfo.telefono) {
      formData.append('telefono', empresaInfo.telefono);
    }

    if (empresaInfo.celular) {
      formData.append('celular', empresaInfo.celular);
    }

    if (empresaInfo.email) {
      formData.append('email', empresaInfo.email);
    }

    if (empresaInfo.website) {
      formData.append('website', empresaInfo.website);
    }

    if (empresaInfo.descripcion) {
      formData.append('descripcion', empresaInfo.descripcion);
    }

    if (empresaInfo.facebook) {
      formData.append('facebook', empresaInfo.facebook);
    }

    if (empresaInfo.instagram) {
      formData.append('instagram', empresaInfo.instagram);
    }

    if (empresaInfo.twitter) {
      formData.append('twitter', empresaInfo.twitter);
    }

    if (empresaInfo.youtube) {
      formData.append('youtube', empresaInfo.youtube);
    }

    if (empresaInfo.whatsapp) {
      formData.append('whatsapp', empresaInfo.whatsapp);
    }

    if (empresaInfo.horario_atencion) {
      formData.append('horario_atencion', empresaInfo.horario_atencion);
    }

    if (empresaInfo.logo) {
      formData.append('logo', empresaInfo.logo);
    }

    return this.http.post<any>(`${this.apiUrl}/empresa-info`, formData);
  }

  // Actualizar información de empresa
  actualizarEmpresaInfo(
    id: number,
    empresaInfo: Partial<EmpresaInfoCreate>
  ): Observable<any> {
    const formData = new FormData();

    Object.keys(empresaInfo).forEach((key) => {
      const value = (empresaInfo as any)[key];
      if (value !== null && value !== undefined) {
        if (key === 'logo' && value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-info/${id}`, formData);
  }

  // Obtener información específica por ID
  obtenerEmpresaInfoPorId(id: number): Observable<EmpresaInfo> {
    return this.http.get<{ success: boolean; data: EmpresaInfo }>(`${this.apiUrl}/empresa-info/${id}`).pipe(
      map((response) => ({
        ...response.data,
        logo_url: response.data.logo
          ? `${this.baseUrl}/storage/${response.data.logo}`
          : undefined,
      }))
    );
  }

  // Método público para obtener información básica de la empresa
obtenerEmpresaInfoPublica(): Observable<any> {
  return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/empresa-info/publica`).pipe(
    map((response) => response.data)
  );
}
}