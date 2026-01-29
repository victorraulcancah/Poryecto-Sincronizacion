import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CuentaPorCobrar {
    id: number;
    cliente_id: number;
    cliente?: any;
    venta_id?: number;
    numero_documento: string;
    fecha_emision: string;
    fecha_vencimiento: string;
    monto_total: number;
    monto_pagado: number;
    saldo: number;
    estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
    dias_credito: number;
    observaciones?: string;
    created_at?: string;
}

export interface PagoCxC {
    id: number;
    cuenta_por_cobrar_id: number;
    monto: number;
    fecha_pago: string;
    metodo_pago: string;
    referencia?: string;
    observaciones?: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CuentasPorCobrarService {
    private apiUrl = `${environment.apiUrl}/contabilidad/cuentas-por-cobrar`;

    constructor(private http: HttpClient) { }

    getCuentas(params?: any): Observable<any> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }
        return this.http.get(this.apiUrl, { params: httpParams });
    }

    getCuenta(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/${id}`);
    }

    crearCuenta(datos: Partial<CuentaPorCobrar>): Observable<any> {
        return this.http.post(this.apiUrl, datos);
    }

    registrarPago(id: number, datos: Partial<PagoCxC>): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/pago`, datos);
    }

    getAntiguedadSaldos(): Observable<any> {
        return this.http.get(`${this.apiUrl}/antiguedad-saldos`);
    }

    getPagos(cuentaId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/${cuentaId}/pagos`);
    }
}
