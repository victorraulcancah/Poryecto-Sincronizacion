import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BannerOferta {
  id?: number;
  imagen: string | null;
  imagen_url?: string | null;
  activo: boolean;
  prioridad: number;
  tipo: 'especiales' | 'semana';
  productos?: ProductoBannerOferta[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductoBannerOferta {
  id: number;
  nombre: string;
  precio: number;
  imagen_principal: string;
  slug: string;
  stock: number;
  descuento_porcentaje: number;
  precio_con_descuento: number;
  categoria_id?: number;
  categoria_nombre?: string;
  marca_id?: number;
  marca_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BannerOfertaService {
  private apiUrl = `${environment.apiUrl}/banners-ofertas`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los banners ofertas (Admin)
   */
  getAll(): Observable<BannerOferta[]> {
    return this.http.get<BannerOferta[]>(this.apiUrl);
  }

  /**
   * Obtener el banner activo para el index - Ofertas Especiales (Público)
   */
  getBannerActivo(): Observable<BannerOferta> {
    return this.http.get<BannerOferta>(`${this.apiUrl}/activo`);
  }

  /**
   * Obtener el banner activo para la Oferta de la Semana (Público)
   */
  getBannerActivoSemana(): Observable<BannerOferta> {
    return this.http.get<BannerOferta>(`${this.apiUrl}/activo-semana`);
  }

  /**
   * Obtener un banner específico
   */
  getById(id: number): Observable<BannerOferta> {
    return this.http.get<BannerOferta>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo banner
   */
  create(formData: FormData): Observable<BannerOferta> {
    return this.http.post<BannerOferta>(this.apiUrl, formData);
  }

  /**
   * Actualizar un banner
   */
  update(id: number, formData: FormData): Observable<BannerOferta> {
    return this.http.post<BannerOferta>(`${this.apiUrl}/${id}`, formData);
  }

  /**
   * Eliminar un banner
   */
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Agregar productos al banner
   */
  agregarProductos(bannerId: number, productos: { producto_id: number, descuento_porcentaje: number }[]): Observable<BannerOferta> {
    return this.http.post<BannerOferta>(`${this.apiUrl}/${bannerId}/productos`, { productos });
  }

  /**
   * Quitar un producto del banner
   */
  quitarProducto(bannerId: number, productoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${bannerId}/productos/${productoId}`);
  }

  /**
   * Actualizar descuento de un producto en el banner
   */
  actualizarDescuentoProducto(bannerId: number, productoId: number, descuento: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${bannerId}/productos/${productoId}`, {
      descuento_porcentaje: descuento
    });
  }
}
