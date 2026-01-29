import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BannerFlashSale {
  id?: number;
  nombre: string;
  color_badge?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  imagen?: string | null;
  imagen_url?: string | null;
  color_boton?: string | null;
  texto_boton?: string | null;
  enlace_url?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BannerFlashSalesService {
  private apiUrl = `${environment.apiUrl}/banners-flash-sales`;
  private apiUrlPublic = `${environment.apiUrl}/banners-flash-sales/activos`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los banners (admin)
   */
  getAll(): Observable<BannerFlashSale[]> {
    return this.http.get<BannerFlashSale[]>(this.apiUrl);
  }

  /**
   * Obtener banners activos (público)
   */
  getActivos(): Observable<BannerFlashSale[]> {
    return this.http.get<BannerFlashSale[]>(this.apiUrlPublic);
  }

  /**
   * Obtener un banner por ID
   */
  getById(id: number): Observable<BannerFlashSale> {
    return this.http.get<BannerFlashSale>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo banner
   */
  create(banner: BannerFlashSale | FormData): Observable<any> {
    const formData = this.convertToFormData(banner);
    return this.http.post(`${this.apiUrl}`, formData);
  }

  /**
   * Actualizar banner existente
   */
  update(id: number, banner: BannerFlashSale | FormData): Observable<any> {
    const formData = this.convertToFormData(banner);
    // No necesitamos _method porque la ruta ya está configurada como POST
    return this.http.post(`${this.apiUrl}/${id}`, formData);
  }

  /**
   * Convertir datos a FormData
   */
  private convertToFormData(data: BannerFlashSale | FormData): FormData {
    if (data instanceof FormData) {
      return data;
    }

    const formData = new FormData();

    // Campos obligatorios
    formData.append('nombre', data.nombre);
    formData.append('fecha_inicio', data.fecha_inicio);
    formData.append('fecha_fin', data.fecha_fin);
    formData.append('activo', data.activo ? '1' : '0');

    // Campos opcionales
    if (data.color_badge) formData.append('color_badge', data.color_badge);
    if (data.color_boton) formData.append('color_boton', data.color_boton);
    if (data.texto_boton) formData.append('texto_boton', data.texto_boton);
    if (data.enlace_url) formData.append('enlace_url', data.enlace_url);

    // Archivo de imagen
    if ((data as any).imagen instanceof File) {
      formData.append('imagen', (data as any).imagen);
    }

    return formData;
  }

  /**
   * Eliminar banner
   */
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Activar/Desactivar banner
   */
  toggleActivo(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-activo`, {});
  }
}
