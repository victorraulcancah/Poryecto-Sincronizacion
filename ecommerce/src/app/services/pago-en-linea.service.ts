import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Línea de una compra pagada por la pasarela. */
export interface PagoEnLineaItem {
  producto_id: number;
  codigo_producto: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen_url: string | null;
}

/** Etapas que marca el personal al atender la compra. */
export type EstadoProcesoCompra =
  | 'pendiente_facturar'
  | 'facturado'
  | 'en_delivery'
  | 'entregado'
  | 'cancelado';

/** Compra registrada por la pasarela de pago. */
export interface PagoEnLinea {
  codigo: string;
  estado: 'pagado' | 'rechazado';
  /** Seguimiento manual de la compra (facturación y delivery). */
  estado_proceso: EstadoProcesoCompra;
  /** Número del comprobante emitido en el ERP, cuando ya se facturó. */
  comprobante_erp: string | null;
  comprobante_enviado_at: string | null;
  simulado: boolean;
  referencia_pasarela: string | null;
  mensaje_pasarela: string | null;
  moneda: string; // 's' soles, 'd' dólares
  subtotal: number;
  igv: number;
  descuento: number;
  cupon_codigo: string | null;
  costo_envio: number;
  total: number;
  items: PagoEnLineaItem[];
  forma_envio: string;
  cliente_nombre: string;
  cliente_email: string;
  telefono_contacto: string;
  direccion_envio: string;
  departamento_nombre: string | null;
  provincia_nombre: string | null;
  distrito_nombre: string | null;
  observaciones: string | null;
  tarjeta_marca: string | null;
  tarjeta_ultimos4: string | null;
  fecha: string;
}

/** Lo que se envía al cobrar. El número de la tarjeta nunca viaja: solo el token. */
export interface PagarRequest {
  cliente_nombre: string;
  cliente_email: string;
  numero_documento?: string;
  telefono_contacto: string;
  direccion_envio: string;
  departamento_nombre: string;
  provincia_nombre: string;
  distrito_nombre: string;
  observaciones?: string;
  /** Solo hace falta cuando el carrito mezcla soles y dólares. */
  moneda?: string;
  token: string;
  tarjeta_marca?: string;
  tarjeta_ultimos4: string;
}

export interface PagarResponse {
  status: string;
  aprobado: boolean;
  mensaje: string;
  pago: PagoEnLinea;
}

/** Tokens de las tarjetas de prueba de la pasarela simulada. */
export const TOKEN_PRUEBA_APROBADO = 'tok_test_aprobado';
export const TOKEN_PRUEBA_RECHAZADO = 'tok_test_rechazado';

@Injectable({
  providedIn: 'root'
})
export class PagoEnLineaService {
  constructor(private http: HttpClient) {}

  /** Si la pasarela está en modo prueba (para mostrar el aviso en pantalla). */
  obtenerConfiguracion(): Observable<{ modo_prueba: boolean }> {
    return this.http.get<{ modo_prueba: boolean }>(`${environment.apiUrl}/pasarela/configuracion`);
  }

  /** Cobra el carrito del cliente y registra la compra. */
  pagar(datos: PagarRequest): Observable<PagarResponse> {
    return this.http.post<PagarResponse>(`${environment.apiUrl}/pago-en-linea/pagar`, datos);
  }

  /** Compras pagadas del cliente con el estado que marca el personal. */
  listarMias(): Observable<{ status: string; pagos: PagoEnLinea[] }> {
    return this.http.get<{ status: string; pagos: PagoEnLinea[] }>(`${environment.apiUrl}/pago-en-linea`);
  }

  /** Una compra propia, para volver a ver su confirmación. */
  obtener(codigo: string): Observable<{ status: string; pago: PagoEnLinea }> {
    return this.http.get<{ status: string; pago: PagoEnLinea }>(
      `${environment.apiUrl}/pago-en-linea/${encodeURIComponent(codigo)}`
    );
  }
}
