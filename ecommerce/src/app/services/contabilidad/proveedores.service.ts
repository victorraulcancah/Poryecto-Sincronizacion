import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Proveedor {
  id: number;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  telefono?: string;
  email?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  dias_credito: number;
  limite_credito: number;
  activo: boolean;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProveedorFormData {
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  telefono?: string;
  email?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  dias_credito?: number;
  limite_credito?: number;
  activo?: boolean;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private apiUrl = `${environment.apiUrl}/contabilidad/proveedores`;

  constructor(private http: HttpClient) {}

  /**
   * Listar proveedores con filtros
   */
  getProveedores(params?: {
    search?: string;
    activo?: boolean;
    page?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  /**
   * Obtener un proveedor específico
   */
  getProveedor(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo proveedor
   */
  crear(data: ProveedorFormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Actualizar proveedor
   */
  actualizar(id: number, data: Partial<ProveedorFormData>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  // Nota: Los endpoints DELETE, PATCH y búsqueda por RUC no existen en el backend
  // Solo están disponibles: GET, POST, PUT para proveedores
}
