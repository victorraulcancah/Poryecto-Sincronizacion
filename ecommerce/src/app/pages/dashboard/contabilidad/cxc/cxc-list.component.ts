import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuentasPorCobrarService, CuentaPorCobrar } from '../../../../services/contabilidad/cuentas-por-cobrar.service';
import { PagoModalComponent } from '../../../../components/pago-modal/pago-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cxc-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PagoModalComponent],
  template: `
    <div class="container-fluid p-24">
      <div class="d-flex justify-content-between align-items-center mb-24">
        <div>
          <h5 class="text-heading fw-semibold mb-8">Cuentas por Cobrar</h5>
          <p class="text-gray-500 mb-0">Gestión de créditos a clientes</p>
        </div>
        <button class="btn bg-main-600 text-white" (click)="verAntiguedadSaldos()">
          <i class="ph ph-chart-bar me-2"></i>
          Antigüedad de Saldos
        </button>
      </div>

      <!-- KPIs -->
      <div class="row g-4 mb-24">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <div class="w-48 h-48 rounded-12 flex-center bg-info-50">
                  <i class="ph ph-currency-circle-dollar text-info-600 text-2xl"></i>
                </div>
                <div>
                  <p class="text-gray-500 text-sm mb-1">Total por Cobrar</p>
                  <h6 class="fw-semibold mb-0">S/ {{ totalPorCobrar | number:'1.2-2' }}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <div class="w-48 h-48 rounded-12 flex-center bg-warning-50">
                  <i class="ph ph-clock text-warning-600 text-2xl"></i>
                </div>
                <div>
                  <p class="text-gray-500 text-sm mb-1">Vencidas</p>
                  <h6 class="fw-semibold mb-0">{{ cuentasVencidas }}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <div class="w-48 h-48 rounded-12 flex-center bg-success-50">
                  <i class="ph ph-check-circle text-success-600 text-2xl"></i>
                </div>
                <div>
                  <p class="text-gray-500 text-sm mb-1">Al Día</p>
                  <h6 class="fw-semibold mb-0">{{ cuentasAlDia }}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <div class="w-48 h-48 rounded-12 flex-center bg-danger-50">
                  <i class="ph ph-warning text-danger-600 text-2xl"></i>
                </div>
                <div>
                  <p class="text-gray-500 text-sm mb-1">Por Vencer (7 días)</p>
                  <h6 class="fw-semibold mb-0">{{ cuentasPorVencer }}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card border-0 shadow-sm mb-24">
        <div class="card-body">
          <div class="row">
            <div class="col-md-3">
              <label class="form-label">Estado</label>
              <select class="form-select" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO_PARCIAL">Pagado Parcial</option>
                <option value="PAGADO">Pagado</option>
                <option value="VENCIDO">Vencido</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Fecha Inicio</label>
              <input type="date" class="form-control" [(ngModel)]="filtroFechaInicio" 
                     (change)="aplicarFiltros()">
            </div>
            <div class="col-md-3">
              <label class="form-label">Fecha Fin</label>
              <input type="date" class="form-control" [(ngModel)]="filtroFechaFin" 
                     (change)="aplicarFiltros()">
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div *ngIf="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
          </div>

          <div *ngIf="!loading" class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="bg-gray-50">
                <tr>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th class="text-end">Total</th>
                  <th class="text-end">Pagado</th>
                  <th class="text-end">Saldo</th>
                  <th>Estado</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cuenta of cuentas">
                  <td>{{ cuenta.numero_documento }}</td>
                  <td>{{ cuenta.cliente?.nombre || 'N/A' }}</td>
                  <td>{{ cuenta.fecha_emision | date:'dd/MM/yyyy' }}</td>
                  <td>{{ cuenta.fecha_vencimiento | date:'dd/MM/yyyy' }}</td>
                  <td class="text-end">S/ {{ cuenta.monto_total | number:'1.2-2' }}</td>
                  <td class="text-end">S/ {{ cuenta.monto_pagado | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">S/ {{ cuenta.saldo | number:'1.2-2' }}</td>
                  <td>
                    <span class="badge" [ngClass]="getEstadoBadge(cuenta.estado)">
                      {{ cuenta.estado }}
                    </span>
                  </td>
                  <td class="text-center">
                    <button class="btn btn-sm btn-primary" (click)="registrarPago(cuenta)"
                            [disabled]="cuenta.estado === 'PAGADO'">
                      <i class="ph ph-money"></i> Pagar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Pago -->
    <app-pago-modal
      [isOpen]="mostrarModalPago"
      [cuentaId]="cuentaSeleccionada?.id || 0"
      [tipoCuenta]="'CXC'"
      [cuentaInfo]="getCuentaInfo()"
      (onClose)="cerrarModalPago()"
      (onSuccess)="onPagoRegistrado($event)">
    </app-pago-modal>
  `
})
export class CxcListComponent implements OnInit {
  cuentas: CuentaPorCobrar[] = [];
  productos: any[] = [];
  loading = false;
  procesando = false;

  filtroEstado = '';
  filtroClienteId?: number;
  filtroFechaInicio = '';
  filtroFechaFin = '';

  totalPorCobrar = 0;
  cuentasVencidas = 0;
  cuentasAlDia = 0;
  cuentasPorVencer = 0;

  mostrarModalPago = false;
  cuentaSeleccionada: CuentaPorCobrar | null = null;

  constructor(
    private cxcService: CuentasPorCobrarService
  ) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.loading = true;
    const params: any = {};
    
    if (this.filtroEstado) params.estado = this.filtroEstado;
    if (this.filtroClienteId) params.cliente_id = this.filtroClienteId;
    if (this.filtroFechaInicio) params.fecha_inicio = this.filtroFechaInicio;
    if (this.filtroFechaFin) params.fecha_fin = this.filtroFechaFin;

    this.cxcService.getCuentas(params).subscribe({
      next: (res) => {
        this.cuentas = res.data || [];
        this.calcularKPIs();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarCuentas();
  }

  calcularKPIs(): void {
    this.totalPorCobrar = this.cuentas.reduce((sum, c) => sum + c.saldo, 0);
    this.cuentasVencidas = this.cuentas.filter(c => c.estado === 'VENCIDO').length;
    this.cuentasAlDia = this.cuentas.filter(c => c.estado === 'PENDIENTE').length;
    this.cuentasPorVencer = this.cuentas.filter(c => {
      const dias = this.diasParaVencer(c.fecha_vencimiento);
      return dias > 0 && dias <= 7;
    }).length;
  }

  diasParaVencer(fecha: string): number {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  getEstadoBadge(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'bg-warning-50 text-warning-600';
      case 'PAGADO_PARCIAL': return 'bg-info-50 text-info-600';
      case 'PAGADO': return 'bg-success-50 text-success-600';
      case 'VENCIDO': return 'bg-danger-50 text-danger-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  registrarPago(cuenta: CuentaPorCobrar): void {
    this.cuentaSeleccionada = cuenta;
    this.mostrarModalPago = true;
  }

  cerrarModalPago(): void {
    this.mostrarModalPago = false;
    this.cuentaSeleccionada = null;
  }

  getCuentaInfo(): any {
    if (!this.cuentaSeleccionada) return null;
    return {
      numero_documento: this.cuentaSeleccionada.numero_documento,
      monto_total: this.cuentaSeleccionada.monto_total,
      saldo_pendiente: this.cuentaSeleccionada.saldo,
      fecha_vencimiento: this.cuentaSeleccionada.fecha_vencimiento,
      moneda: 'PEN'
    };
  }

  onPagoRegistrado(pago: any): void {
    this.procesando = true;
    this.cxcService.registrarPago(pago.cuenta_id, pago).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Pago registrado correctamente', 'success');
        this.cargarCuentas();
        this.procesando = false;
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Error al registrar pago', 'error');
        this.procesando = false;
      }
    });
  }

  verAntiguedadSaldos(): void {
    this.cxcService.getAntiguedadSaldos().subscribe({
      next: (res) => {
        Swal.fire({
          title: 'Antigüedad de Saldos',
          html: `<pre>${JSON.stringify(res.data, null, 2)}</pre>`,
          width: '800px'
        });
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
      }
    });
  }
}
