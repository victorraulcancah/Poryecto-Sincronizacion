import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Compra {
  id: number;
  codigo_compra: string;
  codigo_cotizacion?: string;
  fecha_compra: string;
  fecha_aprobacion?: string;
  total: number;
  estado_compra: EstadoCompra;
  metodo_pago?: string;
  forma_envio: string;
  direccion_envio: string;
  esta_aprobada: boolean;
  puede_cancelarse: boolean;
  productos: ProductoCompra[];
  detalles_count: number;
  cliente_nombre?: string;
  cliente_email?: string;
  telefono_contacto?: string;
  observaciones?: string;
}

export interface ProductoCompra {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface EstadoCompra {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
}

export interface CompraDetalle {
  id: number;
  codigo_compra: string;
  estado_compra: EstadoCompra;
  esta_aprobada: boolean;
  puede_cancelarse: boolean;
  tracking: TrackingCompra[];
}

export interface TrackingCompra {
  id: number;
  estado: EstadoCompra;
  comentario: string;
  fecha_cambio: string;
  usuario: string;
}

export interface CrearCompraRequest {
  productos: {
    producto_id: number;
    cantidad: number;
  }[];
  cliente_nombre: string;
  cliente_email: string;
  direccion_envio: string;
  telefono_contacto: string;
  forma_envio: string;
  metodo_pago: string;
  costo_envio?: number;
  numero_documento?: string;
  ubicacion_completa?: string;
  observaciones?: string;
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  compras?: T;
  compra?: T;
  codigo_compra?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private apiUrl = environment.apiUrl;
  private comprasSubject = new BehaviorSubject<Compra[]>([]);

  public compras$ = this.comprasSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Crear una nueva compra desde ecommerce
   */
  crearCompra(datosCompra: CrearCompraRequest): Observable<ApiResponse<Compra>> {
    return this.http.post<ApiResponse<Compra>>(`${this.apiUrl}/compras`, datosCompra)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Compra creada exitosamente:', response.codigo_compra);
            // Refrescar las compras
            this.obtenerMisCompras().subscribe();
          }
        }),
        catchError(error => {
          console.error('❌ Error creando compra:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener mis compras (para clientes)
   */
  obtenerMisCompras(): Observable<ApiResponse<Compra[]>> {
    return this.http.get<ApiResponse<Compra[]>>(`${this.apiUrl}/compras/mis-compras`)
      .pipe(
        tap(response => {
          if (response.status === 'success' && response.compras) {
            this.comprasSubject.next(response.compras);
            console.log('✅ Compras cargadas:', response.compras.length);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo compras:', error);
          this.comprasSubject.next([]);
          throw error;
        })
      );
  }

  /**
   * Obtener todas las compras (para admin)
   */
  obtenerTodasLasCompras(filtros?: any): Observable<ApiResponse<Compra[]>> {
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

    return this.http.get<ApiResponse<Compra[]>>(`${this.apiUrl}/compras${params}`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Todas las compras cargadas:', response.compras?.length);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo todas las compras:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener detalle de una compra
   */
  obtenerDetalleCompra(id: number): Observable<ApiResponse<Compra>> {
    return this.http.get<ApiResponse<Compra>>(`${this.apiUrl}/compras/${id}`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Detalle de compra cargado:', response.compra?.codigo_compra);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo detalle de compra:', error);
          throw error;
        })
      );
  }

  /**
   * Aprobar una compra (admin)
   */
  aprobarCompra(id: number, comentario?: string): Observable<ApiResponse<Compra>> {
    const data = comentario ? { comentario } : {};

    return this.http.post<ApiResponse<Compra>>(`${this.apiUrl}/compras/${id}/aprobar`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Compra aprobada:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error aprobando compra:', error);
          throw error;
        })
      );
  }

  /**
   * Rechazar una compra (admin)
   */
  rechazarCompra(id: number, comentario: string): Observable<ApiResponse<Compra>> {
    const data = { comentario };

    return this.http.post<ApiResponse<Compra>>(`${this.apiUrl}/compras/${id}/rechazar`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Compra rechazada:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error rechazando compra:', error);
          throw error;
        })
      );
  }

  /**
   * Cancelar una compra (cliente)
   */
  cancelarCompra(id: number, motivo: string): Observable<ApiResponse<any>> {
    const data = { motivo };

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/compras/${id}/cancelar`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Compra cancelada:', response);
            // Refrescar las compras
            this.obtenerMisCompras().subscribe();
          }
        }),
        catchError(error => {
          console.error('❌ Error cancelando compra:', error);
          throw error;
        })
      );
  }

  /**
   * Cambiar estado de una compra (admin)
   */
  cambiarEstadoCompra(id: number, estadoId: number, comentario?: string): Observable<ApiResponse<Compra>> {
    const data = {
      estado_compra_id: estadoId,
      comentario: comentario
    };

    return this.http.patch<ApiResponse<Compra>>(`${this.apiUrl}/compras/${id}/estado`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Estado de compra actualizado:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error cambiando estado de compra:', error);
          throw error;
        })
      );
  }

  /**
   * Procesar pago de una compra (admin)
   */
  procesarPago(id: number, metodoPago: string, referenciaPago?: string, comentario?: string): Observable<ApiResponse<Compra>> {
    const data = {
      metodo_pago: metodoPago,
      referencia_pago: referenciaPago,
      comentario: comentario
    };

    return this.http.post<ApiResponse<Compra>>(`${this.apiUrl}/compras/${id}/procesar-pago`, data)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Pago procesado:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error procesando pago:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener tracking de una compra
   */
  obtenerTrackingCompra(id: number): Observable<ApiResponse<CompraDetalle>> {
    return this.http.get<ApiResponse<CompraDetalle>>(`${this.apiUrl}/compras/${id}/tracking`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Tracking de compra cargado:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo tracking de compra:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener estados de compra
   */
  obtenerEstadosCompra(): Observable<ApiResponse<EstadoCompra[]>> {
    return this.http.get<ApiResponse<EstadoCompra[]>>(`${this.apiUrl}/compras/estados/lista`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Estados de compra cargados');
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo estados de compra:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener estadísticas de compras (admin)
   */
  obtenerEstadisticas(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/compras/estadisticas`)
      .pipe(
        tap(response => {
          if (response.status === 'success') {
            console.log('✅ Estadísticas de compras cargadas:', response);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo estadísticas de compras:', error);
          throw error;
        })
      );
  }

  /**
   * Obtener compras pendientes de aprobación (admin)
   */
  obtenerComprasPendientes(): Observable<ApiResponse<Compra[]>> {
    return this.obtenerTodasLasCompras({ pendientes_aprobacion: true });
  }

  /**
   * Obtener compras desde el Subject (estado local)
   */
  getCompras(): Compra[] {
    return this.comprasSubject.value;
  }

  /**
   * Limpiar compras del estado local
   */
  limpiarCompras(): void {
    this.comprasSubject.next([]);
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
   * Limpiar y corregir texto de estado
   */
  private limpiarTextoEstado(texto: string): string {
    if (!texto) return '';

    // Diccionario de correcciones comunes
    const correcciones: { [key: string]: string } = {
      'Pendiente Aprobacion': 'Pendiente Aprobación',
      'Preparacion': 'Preparación',
      'Cancelacion': 'Cancelación',
      'Aprobacion': 'Aprobación'
    };

    // Buscar y corregir el texto completo
    for (const [incorrecto, correcto] of Object.entries(correcciones)) {
      if (texto.includes(incorrecto.replace('�', ''))) {
        return correcto;
      }
    }

    // Si no se encuentra corrección específica, limpiar caracteres problemáticos
    return texto.replace(/�/g, 'ó').replace(/\uFFFD/g, 'ó');
  }

  /**
   * Obtener clase CSS para el estado
   */
  getEstadoClass(estado: EstadoCompra): string {
    if (!estado?.nombre) return 'bg-secondary text-white';

    // Limpiar el texto primero
    const textoLimpio = this.limpiarTextoEstado(estado.nombre);

    // Normalizar el nombre del estado para comparación
    const estadoNormalizado = textoLimpio.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    switch (estadoNormalizado) {
      case 'pendiente aprobacion':
        return 'bg-warning text-dark';
      case 'aprobada':
        return 'bg-success text-white';
      case 'pagada':
        return 'bg-primary text-white';
      case 'en preparacion':
        return 'bg-info text-white';
      case 'enviada':
        return 'bg-primary text-white';
      case 'entregada':
        return 'bg-success text-white';
      case 'cancelada':
        return 'bg-danger text-white';
      case 'rechazada':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  /**
   * Obtener texto limpio del estado para mostrar
   */
  getEstadoTexto(estado: EstadoCompra): string {
    if (!estado?.nombre) return 'Sin estado';
    return this.limpiarTextoEstado(estado.nombre);
  }

  /**
   * Formatear precio
   */
  formatearPrecio(precio: number | string): string {
    const numericPrice = typeof precio === 'string' ? parseFloat(precio) : precio;
    return isNaN(numericPrice) ? '0.00' : numericPrice.toFixed(2);
  }

  /**
   * Verificar si una compra necesita atención (admin)
   */
  necesitaAtencion(compra: Compra): boolean {
    if (!compra.estado_compra?.nombre) return false;
    const estadoNormalizado = compra.estado_compra.nombre.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return estadoNormalizado === 'pendiente aprobacion';
  }

  /**
   * Obtener icono para el estado
   */
  getEstadoIcon(estado: EstadoCompra): string {
    if (!estado?.nombre) return 'ph-circle';

    switch (estado.nombre.toLowerCase().replace(/[^\w\s]/g, '').trim()) {
      case 'pendiente aprobacion':
        return 'ph-clock';
      case 'aprobada':
        return 'ph-check-circle';
      case 'pagada':
        return 'ph-credit-card';
      case 'en preparacion':
        return 'ph-package';
      case 'enviada':
        return 'ph-truck';
      case 'entregada':
        return 'ph-check-circle-fill';
      case 'cancelada':
        return 'ph-x-circle';
      case 'rechazada':
        return 'ph-x-circle-fill';
      default:
        return 'ph-circle';
    }
  }
}