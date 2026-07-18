// src/services/empresa-info.service.ts
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmpresaInfo, EmpresaInfoCreate } from '../types/empresa-info.types';

@Injectable({
  providedIn: 'root',
})
export class EmpresaInfoService {
  private apiUrl = `${environment.apiUrl}`;
  private baseUrl = environment.baseUrl;
  private isBrowser: boolean;

  // Cache en localStorage para evitar el "flash" de color/logo por defecto
  // mientras se resuelve la llamada asíncrona a /empresa-info/publica.
  private readonly CACHE_KEY = 'empresa_info_publica_cache';

  private empresaInfoPublicaSubject = new BehaviorSubject<any>(null);
  public empresaInfoPublica$ = this.empresaInfoPublicaSubject.asObservable();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const cached = this.leerCache();
      if (cached) {
        this.empresaInfoPublicaSubject.next(cached);
      }
    }
  }

  private leerCache(): any {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private guardarCache(data: any): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch {
      // localStorage no disponible (modo privado, cuota llena, etc.) - se ignora
    }
  }

  // Obtener información de la empresa
  obtenerEmpresaInfo(): Observable<EmpresaInfo> {
    return this.http.get<{ success: boolean; data: EmpresaInfo }>(`${this.apiUrl}/empresa-info`).pipe(
      map((response) => ({
        ...response.data,
        logo_url: response.data.logo
          ? `${this.baseUrl}/storage/${response.data.logo}`
          : undefined,
        imagen_introduccion_url: response.data.imagen_introduccion
          ? `${this.baseUrl}/storage/${response.data.imagen_introduccion}`
          : undefined,
        imagen_descripcion_url: response.data.imagen_descripcion
          ? `${this.baseUrl}/storage/${response.data.imagen_descripcion}`
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

    if (empresaInfo.imagen_descripcion) {
      formData.append('imagen_descripcion', empresaInfo.imagen_descripcion);
    }

    if (empresaInfo.sobre_nosotros) {
      formData.append('sobre_nosotros', empresaInfo.sobre_nosotros);
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

    if (empresaInfo.tiktok) {
      formData.append('tiktok', empresaInfo.tiktok);
    }

    if (empresaInfo.whatsapp) {
      formData.append('whatsapp', empresaInfo.whatsapp);
    }

    if (empresaInfo.horario_atencion) {
      formData.append('horario_atencion', empresaInfo.horario_atencion);
    }

    if (empresaInfo.color_navbar) {
      formData.append('color_navbar', empresaInfo.color_navbar);
    }

    if (empresaInfo.color_sidebar) {
      formData.append('color_sidebar', empresaInfo.color_sidebar);
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
      if (value === null || value === undefined) return;

      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
      } else {
        formData.append(key, value.toString());
      }
    });

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-info/${id}`, formData);
  }

  // Actualiza el texto y la imagen de "Sobre Nosotros" (no requiere el resto de campos obligatorios)
  actualizarSobreNosotros(
    id: number,
    datos: { sobreNosotros: string; imagen?: File | null; eliminarImagen?: boolean }
  ): Observable<any> {
    const formData = new FormData();
    formData.append('sobre_nosotros', datos.sobreNosotros);

    if (datos.imagen) {
      formData.append('imagen_introduccion', datos.imagen);
    } else if (datos.eliminarImagen) {
      formData.append('eliminar_imagen_introduccion', '1');
    }

    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/empresa-info/${id}/sobre-nosotros`, formData);
  }

  // Actualiza la duración (en segundos) del carrusel del banner principal
  actualizarConfigBanner(id: number, duracionSegundos: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/empresa-info/${id}/config-banner`, {
      duracion_banner_segundos: duracionSegundos,
    });
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

  obtenerEmpresaInfoPublica(): Observable<any> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/empresa-info/publica?_t=${Date.now()}`).pipe(
      map((response) => response.data),
      tap((data) => {
        this.empresaInfoPublicaSubject.next(data);
        this.guardarCache(data);
      })
    );
  }

  getPublicInfoValue(): any {
    return this.empresaInfoPublicaSubject.value;
  }

  refreshPublicInfo(): void {
    this.obtenerEmpresaInfoPublica().subscribe();
  }
}