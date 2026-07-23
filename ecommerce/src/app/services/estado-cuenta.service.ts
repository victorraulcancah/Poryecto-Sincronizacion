import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MovimientoEstadoCuenta {
  id: string;
  created_at: string;
  estado?: boolean;
  type?: string;
  cantidad?: number | null;
  nro_documento?: number | string;
  boleta?: { tipo?: string; serie?: number | string; numero?: number | string } | null;
  product?: { codigo?: string; name?: string; brand?: { name?: string } } | null;
  payment_method?: { name?: string } | null;
  paymentMethod?: { name?: string } | null;
  payment_methods?: { name: string }[];
  total_dolares?: number;
  total_soles?: number;
  dolares?: boolean;
  subtotal_con_dto?: number;
  moneda?: string;
  total_sumado?: number;
  monto?: number;
  sale?: any;
  [key: string]: any;
}

export interface ClienteInfoErp {
  credito: number;
  linea_utilizada: number;
  credito_disponible: number;
  deuda_total_soles: number;
  deuda_total_dolares: number;
  [key: string]: any;
}

export interface EstadoCuentaResponse {
  codigo: string;
  data: MovimientoEstadoCuenta[];
  deudaTotalSoles: number;
  deudaTotalDolares: number;
  deuda_anterior_soles?: number;
  deuda_anterior_dolares?: number;
  client: ClienteInfoErp;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class EstadoCuentaService {
  // Consulta directa al ERP 7Power (endpoint público, no requiere token del ERP).
  private erpApiUrl = environment.erpApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * agrupado=false: vista detallada por producto (misma que el ERP muestra
   * por defecto, con columna Cantidad).
   */
  obtenerEstadoCuenta(
    codigoErp: string,
    fechas?: [string, string]
  ): Observable<EstadoCuentaResponse> {
    const params: Record<string, string | string[]> = {
      codigo: codigoErp,
      agrupado: 'false',
    };
    if (fechas) {
      params['fechas[]'] = fechas;
    }
    return this.http.get<EstadoCuentaResponse>(
      `${this.erpApiUrl}/ecommerce/estado-de-cuenta`,
      { params }
    );
  }
}
