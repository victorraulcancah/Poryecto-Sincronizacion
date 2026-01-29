import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuentasPorPagarService, CuentaPorPagar } from '../../../../services/contabilidad/cuentas-por-pagar.service';
import { CxPModalComponent } from '../../../../components/cxp-modal/cxp-modal.component';
import { PagoModalComponent } from '../../../../components/pago-modal/pago-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cxp-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CxPModalComponent, PagoModalComponent],
  template: `
    <div class="container-fluid p-24">
      <div class="d-flex justify-content-between align-items-center mb-24">
        <div>
          <h5 class="text-heading fw-semibold mb-8">Cuentas por Pagar</h5>
          <p class="text-gray-500 mb-0">Gestión de deudas con proveedores</p>
        </div>
        <div>
          <button class="btn btn-outline-primary me-2" (click)="verAntiguedadSaldos()">
            <i class="ph ph-chart-bar me-2"></i>
            Antigüedad de Saldos
          </button>
          <button class="btn bg-main-600 text-white" (click)="nuevaCxP()">
            <i class="ph ph-plus me-2"></i>
            Nueva Cuenta por Pagar
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="row g-4 mb-24">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center gap-3">
                <div class="w-48 h-48 rounded-12 flex-center bg-danger-50">
                  <i class="ph ph-currency-circle-dollar text-danger-600 text-2xl"></i>
                </div>
                <div>
                  <p class="text-gray-500 text-sm mb-1">Total por Pagar</p>
                  <h6 class="fw-semibold mb-0">S/ {{ totalPorPagar | number:'1.2-2' }}</h6>
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
                <div class="w-48 h-48 rounded-12 flex-center bg-info-50">
                  <i class="ph ph-warning text-info-600 text-2xl"></i>
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
                  <th>Proveedor</th>
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
                  <td>{{ cuenta.proveedor?.razon_social || 'N/A' }}</td>
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
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" (click)="editarCxP(cuenta.id)" title="Editar">
                        <i class="ph ph-pencil"></i>
                      </button>
                      <button class="btn btn-outline-success" (click)="registrarPago(cuenta)"
                              [disabled]="cuenta.estado === 'PAGADO'" title="Pagar">
                        <i class="ph ph-money"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal CxP -->
    <app-cxp-modal
      [isOpen]="mostrarModalCxP"
      [cxpId]="cxpSeleccionada"
      (onClose)="cerrarModalCxP()"
      (onSuccess)="onCxPGuardada($event)">
    </app-cxp-modal>

    <!-- Modal Pago -->
    <app-pago-modal
      [isOpen]="mostrarModalPago"
      [cuentaId]="cuentaSeleccionada?.id || 0"
      [tipoCuenta]="'CXP'"
      [cuentaInfo]="getCuentaInfo()"
      (onClose)="cerrarModalPago()"
      (onSuccess)="onPagoRegistrado($event)">
    </app-pago-modal>
  `
})
export class CxpListComponent implements OnInit {
  cuentas: CuentaPorPagar[] = [];
  loading = false;
  procesando = false;

  filtroEstado = '';
  filtroProveedorId?: number;
  filtroFechaInicio = '';
  filtroFechaFin = '';

  totalPorPagar = 0;
  cuentasVencidas = 0;
  cuentasAlDia = 0;
  cuentasPorVencer = 0;

  mostrarModalCxP = false;
  mostrarModalPago = false;
  cxpSeleccionada?: number;
  cuentaSeleccionada: CuentaPorPagar | null = null;

  constructor(private cxpService: CuentasPorPagarService) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.loading = true;
    const params: any = {};
    
    if (this.filtroEstado) params.estado = this.filtroEstado;
    if (this.filtroProveedorId) params.proveedor_id = this.filtroProveedorId;
    if (this.filtroFechaInicio) params.fecha_inicio = this.filtroFechaInicio;
    if (this.filtroFechaFin) params.fecha_fin = this.filtroFechaFin;

    this.cxpService.getCuentas(params).subscribe({
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
    this.totalPorPagar = this.cuentas.reduce((sum, c) => sum + c.saldo, 0);
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

  nuevaCxP(): void {
    this.cxpSeleccionada = undefined;
    this.mostrarModalCxP = true;
  }

  editarCxP(id: number): void {
    this.cxpSeleccionada = id;
    this.mostrarModalCxP = true;
  }

  cerrarModalCxP(): void {
    this.mostrarModalCxP = false;
    this.cxpSeleccionada = undefined;
  }

  onCxPGuardada(cxp: any): void {
    this.cargarCuentas();
    Swal.fire('Éxito', 'Cuenta por pagar guardada correctamente', 'success');
  }

  registrarPago(cuenta: CuentaPorPagar): void {
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
      moneda: this.cuentaSeleccionada.moneda
    };
  }

  onPagoRegistrado(pago: any): void {
    this.procesando = true;
    this.cxpService.registrarPago(pago.cuenta_id, pago).subscribe({
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
    this.cxpService.getAntiguedadSaldos().subscribe({
      next: (res) => {
        Swal.fire({
          title: 'Antigüedad de Saldos - Cuentas por Pagar',
          html: `<pre>${JSON.stringify(res.data, null, 2)}</pre>`,
          width: '800px'
        });
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
      }
    });
  }
}
