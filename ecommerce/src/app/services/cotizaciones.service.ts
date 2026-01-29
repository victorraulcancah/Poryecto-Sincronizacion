import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Cotizacion {
  id: number;
  codigo_cotizacion: string;
  fecha_cotizacion: string;
  fecha_vencimiento?: string;
  total: number;
  estado_actual: EstadoCotizacion;
  forma_envio: string;
  direccion_envio: string;
  observaciones?: string;
  puede_convertir_compra: boolean;
  esta_vencida: boolean;
  productos: ProductoCotizacion[];
  detalles_count: number;
  cliente_nombre?: string;
  cliente_email?: string;
  telefono_contacto?: string;
  metodo_pago_preferido?: string;
}

export interface ProductoCotizacion {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface EstadoCotizacion {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  permite_conversion: boolean;
}

export interface CotizacionDetalle {
  id: number;
  codigo_cotizacion: string;
  estado_actual: EstadoCotizacion;
  puede_convertir_compra: boolean;
  tracking: TrackingCotizacion[];
}

export interface TrackingCotizacion {
  id: number;
  estado: EstadoCotizacion;
  comentario: string;
  fecha_cambio: string;
  usuario: string;
}

export interface CrearCotizacionRequest {
  productos: {
    producto_id: number;
    cantidad: number;
  }[];
  metodo_pago_preferido?: string;
  direccion_envio: string;
  telefono_contacto: string;
  observaciones?: string;
  cliente_nombre: string;
  cliente_email: string;
  forma_envio: string;
  costo_envio?: number;
  numero_documento?: string;
  departamento_id?: string;
  provincia_id?: string;
  distrito_id?: string;
  departamento_nombre?: string;
  provincia_nombre?: string;
  distrito_nombre?: string;
  ubicacion_completa?: string;
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  cotizaciones?: T;
  cotizacion?: T;
  codigo_cotizacion?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {
  private apiUrl = environment.apiUrl;
  private cotizacionesSubject = new BehaviorSubject<Cotizacion[]>([]);

  public cotizaciones$ = this.cotizacionesSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Crear cotización desde el checkout
   */
  crearCotizacionEcommerce(data: CrearCotizacionRequest): Observable<ApiResponse<Cotizacion>> {
    return this.http.post<ApiResponse<Cotizacion>>(`${this.apiUrl}/cotizaciones/ecommerce`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Cotización creada:', response.codigo_cotizacion);
          }
        }),
        catchError(error => {
          console.error('❌ Error creando cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener mis cotizaciones (para clientes)
   */
  obtenerMisCotizaciones(): Observable<ApiResponse<Cotizacion[]>> {
    return this.http.get<ApiResponse<Cotizacion[]>>(`${this.apiUrl}/cotizaciones/mis-cotizaciones`)
      .pipe(
        tap(response => {
          if (response.status === 'success' && response.cotizaciones) {
            this.cotizacionesSubject.next(response.cotizaciones);
            console.log('✅ Cotizaciones cargadas:', response.cotizaciones.length);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo cotizaciones:', error);
          this.cotizacionesSubject.next([]);
          throw error;
        })
      );
  }

  /**
   * Obtener todas las cotizaciones (para admin)
   */
  obtenerTodasLasCotizaciones(filtros?: any): Observable<ApiResponse<Cotizacion[]>> {
    let params = '';
    if (filtros) {
      const searchParams = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
          searchParams.append(key, filtros[key]);
        }
      });
      params = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }

    return this.http.get<ApiResponse<Cotizacion[]>>(`${this.apiUrl}/cotizaciones${params}`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Todas las cotizaciones cargadas:', response.cotizaciones?.length);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo todas las cotizaciones:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener detalle de una cotización
   */
  obtenerDetalleCotizacion(id: number): Observable<ApiResponse<Cotizacion>> {
    return this.http.get<ApiResponse<Cotizacion>>(`${this.apiUrl}/cotizaciones/${id}`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Detalle de cotización cargado:', response.cotizacion?.codigo_cotizacion);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo detalle de cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Convertir cotización a compra
   */
  convertirACompra(id: number, metodoPago?: string): Observable<ApiResponse<any>> {
    const data = metodoPago ? { metodo_pago: metodoPago } : {};

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/cotizaciones/${id}/convertir-compra`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Cotización convertida a compra:', response);
            // Refrescar las cotizaciones
            this.obtenerMisCotizaciones().subscribe();
          }
        }),
        catchError(error => {
          console.error('❌ Error convirtiendo cotización a compra:', error);
          throw error;
        })
      );
  }

  /**
   * Eliminar cotización
   */
  eliminarCotizacion(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/cotizaciones/${id}`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Cotización eliminada:', id);
            // Refrescar las cotizaciones automáticamente
            this.obtenerMisCotizaciones().subscribe();
          }
        }),
        catchError(error => {
          console.error('❌ Error eliminando cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Pedir/Solicitar procesamiento de cotización (notifica al admin)
   */
  pedirCotizacion(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/cotizaciones/${id}/pedir`, {})
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Solicitud de cotización enviada:', id);
            // Refrescar las cotizaciones para actualizar el estado
            this.obtenerMisCotizaciones().subscribe();
          }
        }),
        catchError(error => {
          console.error('❌ Error enviando solicitud de cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener tracking de una cotización
   */
  obtenerTrackingCotizacion(id: number): Observable<ApiResponse<CotizacionDetalle>> {
    return this.http.get<ApiResponse<CotizacionDetalle>>(`${this.apiUrl}/cotizaciones/${id}/tracking`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Tracking de cotización cargado:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo tracking de cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Cambiar estado de una cotización (admin)
   */
  cambiarEstadoCotizacion(id: number, estadoId: number, comentario?: string): Observable<ApiResponse<Cotizacion>> {
    const data = {
      estado_cotizacion_id: estadoId,
      comentario: comentario
    };

    return this.http.patch<ApiResponse<Cotizacion>>(`${this.apiUrl}/cotizaciones/${id}/estado`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Estado de cotización actualizado:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error cambiando estado de cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener estados de cotización
   */
  obtenerEstadosCotizacion(): Observable<ApiResponse<EstadoCotizacion[]>> {
    return this.http.get<ApiResponse<EstadoCotizacion[]>>(`${this.apiUrl}/cotizaciones/estados/lista`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Estados de cotización cargados');
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo estados de cotización:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener estadísticas de cotizaciones (admin)
   */
  obtenerEstadisticas(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/cotizaciones/estadisticas`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Estadísticas de cotizaciones cargadas:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo estadísticas de cotizaciones:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener cotizaciones desde el Subject (estado local)
   */
  getCotizaciones(): Cotizacion[] {
    return this.cotizacionesSubject.value;
  }

  /**
   * Limpiar cotizaciones del estado local
   */
  limpiarCotizaciones(): void {
    this.cotizacionesSubject.next([]);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Verificar si una cotización está vencida
   */
  estaVencida(cotizacion: Cotizacion): boolean {
    if (!cotizacion.fecha_vencimiento) return false;
    return new Date() > new Date(cotizacion.fecha_vencimiento);
  }

  /**
   * Obtener clase CSS para el estado
   */
  getEstadoClass(estado: EstadoCotizacion): string {
    const clases: { [key: string]: string } = {
      'Pendiente': 'bg-warning-50 text-warning-600',
      'En Revisión': 'bg-info-50 text-info-600',
      'Aprobada': 'bg-success-50 text-success-600',
      'Rechazada': 'bg-danger-50 text-danger-600',
      'Enviada para Compra': 'bg-purple-50 text-purple-600',
      'Convertida a Compra': 'bg-primary-50 text-primary-600',
      'Vencida': 'bg-secondary-50 text-secondary-600',
      'Cancelada': 'bg-danger-50 text-danger-600'
    };

    return clases[estado.nombre] || 'bg-secondary-50 text-secondary-600';
  }

  /**
   * Formatear precio
   */
  formatearPrecio(precio: number): string {
    return precio.toFixed(2);
  }

  /**
   * Generar PDF de una cotización
   */
  generarPDF(id: number): Observable<Blob> {
    const url = `${this.apiUrl}/cotizaciones/${id}/pdf`;

    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      tap(() => {
        console.log('✅ PDF generado exitosamente');
      }),
      catchError(error => {
        console.error('❌ Error generando PDF:', error);
        throw error;
      })
    );
  }

  /**
   * Descargar PDF de una cotización
   */
  descargarPDF(id: number, nombreArchivo?: string): void {
    this.generarPDF(id).subscribe({
      next: (blob) => {
        // Crear URL temporal para el blob
        const url = window.URL.createObjectURL(blob);

        // Crear elemento <a> temporal para la descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo || `Cotizacion_${id}.pdf`;

        // Hacer clic automáticamente para descargar
        document.body.appendChild(link);
        link.click();

        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al descargar PDF:', error);
        // Puedes agregar aquí una notificación de error al usuario
      }
    });
  }
}