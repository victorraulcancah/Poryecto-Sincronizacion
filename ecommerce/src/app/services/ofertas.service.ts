// src/app/services/ofertas.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Oferta {
  id: number;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  tipo_descuento: 'porcentaje' | 'cantidad_fija';
  valor_descuento: number;
  fecha_inicio: string;
  fecha_fin: string;
  imagen_url?: string;
  banner_imagen_url?: string;
  color_fondo?: string;
  texto_boton: string;
  enlace_url: string;
  mostrar_countdown: boolean;
  es_oferta_principal?: boolean;
  es_oferta_semana?: boolean;
  productos?: ProductoOferta[];
}

export interface ProductoOferta {
  id: number;
  nombre: string;
  precio_original: number | string;
  precio_oferta: number | string;
  descuento_porcentaje: number;
  stock_oferta?: number;
  vendidos_oferta: number;
  stock_disponible?: number;
  imagen_url?: string;
  fecha_fin_oferta: string;
  es_flash_sale: boolean;
  categoria?: string;
  marca?: string;
}

export interface OfertaPrincipalResponse {
  oferta_principal: Oferta | null;
  productos: ProductoOferta[];
  mensaje?: string;
}
export interface OfertaSemanaResponse {
  oferta_semana: Oferta | null;
  productos: ProductoOferta[];
  mensaje?: string;
}

export interface Cupon {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo_descuento: 'porcentaje' | 'cantidad_fija';
  valor_descuento: number;
  compra_minima?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  limite_uso?: number;
  usos_actuales?: number;
  solo_primera_compra?: boolean;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfertasService {
  private apiUrl = `${environment.apiUrl}`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  obtenerOfertasPublicas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.apiUrl}/ofertas/publicas`);
  }

  obtenerFlashSales(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.apiUrl}/ofertas/flash-sales`);
  }

  obtenerProductosEnOferta(): Observable<ProductoOferta[]> {
    return this.http.get<ProductoOferta[]>(`${this.apiUrl}/ofertas/productos`);
  }

  // ✅ NUEVO MÉTODO: Obtener oferta principal del día
  obtenerOfertaPrincipalDelDia(): Observable<OfertaPrincipalResponse> {
    return this.http.get<OfertaPrincipalResponse>(`${this.apiUrl}/ofertas/principal-del-dia`);
  }
  // ✅ NUEVO MÉTODO: Obtener oferta de la semana
obtenerOfertaSemanaActiva(): Observable<OfertaSemanaResponse> {
  return this.http.get<OfertaSemanaResponse>(`${this.apiUrl}/ofertas/semana-activa`);
}

  validarCupon(codigo: string, total: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/cupones/validar`, { codigo, total });
  }

    /**
     * Obtener cupones activos para la tienda
     * ✅ OPTIMIZADO: Solo se ejecuta en el navegador, NO durante SSR
     */
    obtenerCuponesActivos(): Observable<Cupon[]> {
      // ✅ Si estamos en el servidor (SSR), retornar array vacío inmediatamente
      if (!this.isBrowser) {
        return of([]);
      }

      return this.http.get<Cupon[]>(`${this.apiUrl}/cupones/activos`)
        .pipe(
          catchError(error => {
            console.error('Error al obtener cupones activos:', error);
            return of([]); // Retornar array vacío en caso de error
          })
        );
    }

    /**
     * Obtener cupones disponibles para el usuario autenticado
     * Excluye los cupones que el usuario ya ha usado
     * ✅ OPTIMIZADO: Solo se ejecuta en el navegador, NO durante SSR
     */
    obtenerCuponesDisponiblesUsuario(): Observable<Cupon[]> {
      // ✅ Si estamos en el servidor (SSR), retornar array vacío inmediatamente
      if (!this.isBrowser) {
        return of([]);
      }

      return this.http.get<Cupon[]>(`${this.apiUrl}/cupones/disponibles`)
        .pipe(
          catchError(error => {
            console.error('Error al obtener cupones disponibles:', error);
            return of([]);
          })
        );
    }

    /**
     * Registrar el uso de un cupón
     */
    registrarUsoCupon(cuponId: number, descuentoAplicado: number, totalCompra: number, ventaId?: number): Observable<any> {
      return this.http.post(`${this.apiUrl}/cupones/registrar-uso`, {
        cupon_id: cuponId,
        descuento_aplicado: descuentoAplicado,
        total_compra: totalCompra,
        venta_id: ventaId
      });
    }

    /**
     * Obtener cupones usados por el usuario autenticado
     */
    obtenerCuponesUsados(): Observable<any[]> {
      return this.http.get<any[]>(`${this.apiUrl}/cupones/usados`)
        .pipe(
          catchError(error => {
            console.error('Error al obtener cupones usados:', error);
            return of([]);
          })
        );
    }
}