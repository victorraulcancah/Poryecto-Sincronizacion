import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CatalogosSunatService {
  private apiUrl = `${environment.apiUrl}/facturacion/catalogos`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todos los catálogos disponibles
   */
  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  /**
   * Obtener items de un catálogo específico
   */
  getCatalogo(catalogo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${catalogo}`);
  }

  /**
   * Obtener detalle de un item del catálogo
   */
  getItem(catalogo: string, codigo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${catalogo}/${codigo}`);
  }

  /**
   * Obtener tipos de documento de identidad
   */
  getTiposDocumentoIdentidad(): Observable<any> {
    return this.getCatalogo('tipo-documento-identidad');
  }

  /**
   * Obtener tipos de afectación IGV
   */
  getTiposAfectacionIgv(): Observable<any> {
    return this.getCatalogo('tipo-afectacion-igv');
  }

  /**
   * Obtener unidades de medida
   */
  getUnidadesMedida(): Observable<any> {
    return this.getCatalogo('unidad-medida');
  }

  /**
   * Obtener monedas
   */
  getMonedas(): Observable<any> {
    return this.getCatalogo('moneda');
  }

  /**
   * Obtener motivos de nota de crédito
   */
  getMotivosNotaCredito(): Observable<any> {
    return this.getCatalogo('motivo-nota-credito');
  }

  /**
   * Obtener motivos de nota de débito
   */
  getMotivosNotaDebito(): Observable<any> {
    return this.getCatalogo('motivo-nota-debito');
  }

  /**
   * Obtener tipos de precio
   */
  getTiposPrecio(): Observable<any> {
    return this.getCatalogo('tipo-precio');
  }
}
