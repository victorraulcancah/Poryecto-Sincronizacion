// src/app/services/sobre-nosotros.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EmpresaValor,
  EmpresaValorForm,
  EmpresaHito,
  EmpresaHitoForm,
  EmpresaPremio,
  EmpresaPremioForm,
  EmpresaBannerNosotros,
  EmpresaBannerNosotrosForm,
  EmpresaMetodoPago,
  EmpresaMetodoPagoForm,
  SobreNosotrosPublico,
} from '../types/sobre-nosotros.types';

@Injectable({
  providedIn: 'root',
})
export class SobreNosotrosService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private construirFormData(valor: Record<string, any>): FormData {
    const formData = new FormData();

    Object.keys(valor).forEach((key) => {
      const value = valor[key];
      if (value === null || value === undefined) return;

      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'boolean') {
        // Laravel valida 'boolean' de forma estricta: acepta 1/0/'1'/'0', no 'true'/'false'
        formData.append(key, value ? '1' : '0');
      } else {
        formData.append(key, value.toString());
      }
    });

    return formData;
  }

  // ===== Público =====
  obtenerSobreNosotrosPublico(): Observable<SobreNosotrosPublico> {
    return this.http
      .get<{ success: boolean; data: SobreNosotrosPublico }>(
        `${this.apiUrl}/sobre-nosotros/publico?_t=${Date.now()}`
      )
      .pipe(map((response) => response.data));
  }

  // ===== Valores =====
  obtenerValores(): Observable<EmpresaValor[]> {
    return this.http
      .get<{ success: boolean; data: EmpresaValor[] }>(`${this.apiUrl}/empresa-valores`)
      .pipe(map((response) => response.data));
  }

  crearValor(valor: EmpresaValorForm): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresa-valores`, this.construirFormData(valor));
  }

  actualizarValor(id: number, valor: EmpresaValorForm): Observable<any> {
    const formData = this.construirFormData(valor);
    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-valores/${id}`, formData);
  }

  eliminarValor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/empresa-valores/${id}`);
  }

  // ===== Hitos (historia / línea de tiempo) =====
  obtenerHitos(): Observable<EmpresaHito[]> {
    return this.http
      .get<{ success: boolean; data: EmpresaHito[] }>(`${this.apiUrl}/empresa-hitos`)
      .pipe(map((response) => response.data));
  }

  crearHito(hito: EmpresaHitoForm): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresa-hitos`, this.construirFormData(hito));
  }

  actualizarHito(id: number, hito: EmpresaHitoForm): Observable<any> {
    const formData = this.construirFormData(hito);
    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-hitos/${id}`, formData);
  }

  eliminarHito(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/empresa-hitos/${id}`);
  }

  // ===== Premios =====
  obtenerPremios(): Observable<EmpresaPremio[]> {
    return this.http
      .get<{ success: boolean; data: EmpresaPremio[] }>(`${this.apiUrl}/empresa-premios`)
      .pipe(map((response) => response.data));
  }

  crearPremio(premio: EmpresaPremioForm): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresa-premios`, this.construirFormData(premio));
  }

  actualizarPremio(id: number, premio: EmpresaPremioForm): Observable<any> {
    const formData = this.construirFormData(premio);
    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-premios/${id}`, formData);
  }

  eliminarPremio(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/empresa-premios/${id}`);
  }

  // ===== Banner principal (hero carrusel) =====
  obtenerBanners(): Observable<EmpresaBannerNosotros[]> {
    return this.http
      .get<{ success: boolean; data: EmpresaBannerNosotros[] }>(`${this.apiUrl}/empresa-banners-nosotros`)
      .pipe(map((response) => response.data));
  }

  crearBanner(banner: EmpresaBannerNosotrosForm): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresa-banners-nosotros`, this.construirFormData(banner));
  }

  actualizarBanner(id: number, banner: EmpresaBannerNosotrosForm): Observable<any> {
    const formData = this.construirFormData(banner);
    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-banners-nosotros/${id}`, formData);
  }

  eliminarBanner(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/empresa-banners-nosotros/${id}`);
  }

  // ===== Métodos de pago =====
  obtenerMetodosPago(): Observable<EmpresaMetodoPago[]> {
    return this.http
      .get<{ success: boolean; data: EmpresaMetodoPago[] }>(`${this.apiUrl}/empresa-metodos-pago`)
      .pipe(map((response) => response.data));
  }

  crearMetodoPago(metodo: EmpresaMetodoPagoForm): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresa-metodos-pago`, this.construirFormData(metodo));
  }

  actualizarMetodoPago(id: number, metodo: EmpresaMetodoPagoForm): Observable<any> {
    const formData = this.construirFormData(metodo);
    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-metodos-pago/${id}`, formData);
  }

  eliminarMetodoPago(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/empresa-metodos-pago/${id}`);
  }
}
