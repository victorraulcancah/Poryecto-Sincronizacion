// src/app/services/menu.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Menu {
  id?: number;
  nombre: string;
  url: string;
  icono?: string;
  orden: number;
  padre_id?: number | null;
  padre_nombre?: string;
  tipo: 'header' | 'footer' | 'sidebar';
  target: '_self' | '_blank';
  visible: boolean;
  tiene_hijos?: boolean;
  es_submenu?: boolean;
  hijos?: Menu[];
  created_at?: string;
  updated_at?: string;
}

export interface MenuResponse {
  success: boolean;
  message?: string;
  menus?: Menu[];
  menu?: Menu;
  menus_jerarquicos?: Menu[];
}

export interface ActualizarOrdenRequest {
  menus: { id: number; orden: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  /**
   * Obtener menús públicos (solo visibles)
   */
  obtenerMenusPublicos(tipo: string = 'header'): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.apiUrl}/menus/publicos?tipo=${tipo}`);
  }

  // ============================================
  // MÉTODOS ADMIN
  // ============================================

  /**
   * Obtener todos los menús (admin)
   */
  obtenerTodos(tipo: string = 'header'): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.apiUrl}/menus?tipo=${tipo}`);
  }

  /**
   * Obtener un menú por ID
   */
  obtenerPorId(id: number): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.apiUrl}/menus/${id}`);
  }

  /**
   * Crear un nuevo menú
   */
  crear(menu: Partial<Menu>): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.apiUrl}/menus`, menu);
  }

  /**
   * Actualizar un menú existente
   */
  actualizar(id: number, menu: Partial<Menu>): Observable<MenuResponse> {
    return this.http.put<MenuResponse>(`${this.apiUrl}/menus/${id}`, menu);
  }

  /**
   * Eliminar un menú
   */
  eliminar(id: number): Observable<MenuResponse> {
    return this.http.delete<MenuResponse>(`${this.apiUrl}/menus/${id}`);
  }

  /**
   * Cambiar visibilidad de un menú
   */
  toggleVisibilidad(id: number): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.apiUrl}/menus/${id}/toggle-visibilidad`, {});
  }

  /**
   * Actualizar orden de múltiples menús
   */
  actualizarOrden(menus: ActualizarOrdenRequest): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.apiUrl}/menus/actualizar-orden`, menus);
  }

  /**
   * Obtener menús para select (dropdown)
   */
  menusParaSelect(tipo: string = 'header'): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.apiUrl}/menus/para-select?tipo=${tipo}`);
  }
}
