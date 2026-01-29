import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FacturacionService } from '../../../../services/facturacion.service';
import { Comprobante, PaginatedResponse } from '../../../../models/facturacion.model';

@Component({
  selector: 'app-comprobantes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Lista de Comprobantes</h5>
        <p class="text-gray-500 mb-0">Administra todos los comprobantes de facturación electrónica</p>
      </div>
      <button 
        class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
        (click)="nuevaVentaManual()">
        <i class="ph ph-plus me-8"></i>
        Nueva Venta Manual
      </button>
    </div>

    <!-- Filtros -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Estado</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ACEPTADO">Aceptado</option>
              <option value="ACEPTADO_OBS">Aceptado con observaciones</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Fecha Inicio</label>
            <input 
              type="date" 
              class="form-control px-16 py-12 border rounded-8"
              [(ngModel)]="filtroFechaInicio" 
              (change)="aplicarFiltros()">
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Fecha Fin</label>
            <input 
              type="date" 
              class="form-control px-16 py-12 border rounded-8"
              [(ngModel)]="filtroFechaFin" 
              (change)="aplicarFiltros()">
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Buscar</label>
            <div class="input-group">
              <input 
                type="text" 
                class="form-control px-16 py-12 border rounded-start-8"
                placeholder="Código, cliente...">
              <button 
                type="button" 
                class="btn bg-main-600 text-white px-16 rounded-end-8"
                (click)="cargarComprobantes()">
                <i class="ph ph-magnifying-glass"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de comprobantes -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando comprobantes...</p>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Número</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Tipo</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Cliente</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Fecha</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Total</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado SUNAT</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of comprobantes" class="border-bottom border-gray-100">
                <!-- Número -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ c.numero_completo }}</span>
                </td>

                <!-- Tipo -->
                <td class="px-24 py-16">
                  <span class="badge bg-info-50 text-info-600 px-12 py-6 rounded-pill fw-medium">
                    {{ c.tipo_comprobante }}
                  </span>
                </td>

                <!-- Cliente -->
                <td class="px-24 py-16">
                  <div>
                    <h6 class="text-heading fw-medium mb-4">
                      {{ c.cliente_nombre }}
                    </h6>
                  </div>
                </td>

                <!-- Fecha -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ c.fecha_emision }}</span>
                </td>

                <!-- Total -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">S/ {{ c.total | number:'1.2-2' }}</span>
                </td>

                <!-- Estado SUNAT -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="getEstadoClass(c.estado_sunat)">
                    {{ c.estado_sunat }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Descargar PDF -->
                    <button 
                      class="btn bg-danger-50 hover-bg-danger-100 text-danger-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Descargar PDF"
                      (click)="descargarPDF(c)"
                      [disabled]="descargandoPDF">
                      <i class="ph ph-file-pdf text-sm"></i>
                    </button>

                    <!-- Descargar XML -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Descargar XML"
                      (click)="descargarXML(c)"
                      [disabled]="descargandoXML">
                      <i class="ph ph-file-code text-sm"></i>
                    </button>

                    <!-- Reenviar -->
                    <button 
                      class="btn bg-warning-50 hover-bg-warning-100 text-warning-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Reenviar"
                      (click)="reenviar(c)"
                      [disabled]="reenviando">
                      <i class="ph ph-paper-plane text-sm"></i>
                    </button>

                    <!-- Consultar Estado -->
                    <button 
                      class="btn bg-success-50 hover-bg-success-100 text-success-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Consultar Estado"
                      (click)="consultarEstado(c)"
                      [disabled]="consultando">
                      <i class="ph ph-magnifying-glass text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="comprobantes.length === 0" class="text-center py-40">
            <i class="ph ph-file-invoice text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay comprobantes</h6>
            <p class="text-gray-500 mb-16">No se encontraron comprobantes con los filtros aplicados</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="nuevaVentaManual()">
              <i class="ph ph-plus me-8"></i>
              Crear primera venta
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .table td {
      vertical-align: middle;
    }
  `,
  ],
})
export class ComprobantesListComponent implements OnInit {
  comprobantes: Comprobante[] = [];
  loading = false;
  error = '';
  
  // Filtros
  filtroEstado = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  
  // Estados de carga
  descargandoPDF = false;
  descargandoXML = false;
  reenviando = false;
  consultando = false;

  constructor(
    private facturacionService: FacturacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarComprobantes();
  }

  cargarComprobantes(): void {
    this.loading = true;
    this.error = '';
    
    const filtros = {
      estado: this.filtroEstado,
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin
    };

    this.facturacionService.getComprobantes(filtros).subscribe({
      next: (response: PaginatedResponse<Comprobante>) => {
        this.comprobantes = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar comprobantes:', error);
        this.error = 'Error al cargar los comprobantes';
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarComprobantes();
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-warning-50 text-warning-600';
      case 'ACEPTADO':
        return 'bg-success-50 text-success-600';
      case 'ACEPTADO_OBS':
        return 'bg-info-50 text-info-600';
      case 'RECHAZADO':
        return 'bg-danger-50 text-danger-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  descargarPDF(comprobante: Comprobante): void {
    this.descargandoPDF = true;
    this.facturacionService.downloadComprobantePdf(comprobante.id!).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprobante_${comprobante.numero_completo}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.descargandoPDF = false;
      },
      error: (error) => {
        console.error('Error al descargar PDF:', error);
        this.descargandoPDF = false;
      }
    });
  }

  descargarXML(comprobante: Comprobante): void {
    this.descargandoXML = true;
    this.facturacionService.downloadXml(comprobante.id!).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprobante_${comprobante.numero_completo}.xml`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.descargandoXML = false;
      },
      error: (error) => {
        console.error('Error al descargar XML:', error);
        this.descargandoXML = false;
      }
    });
  }

  reenviar(comprobante: Comprobante): void {
    this.reenviando = true;
    this.facturacionService.reenviarComprobante(comprobante.id!).subscribe({
      next: (response) => {
        console.log('Comprobante reenviado:', response);
        this.cargarComprobantes(); // Recargar la lista
        this.reenviando = false;
      },
      error: (error) => {
        console.error('Error al reenviar comprobante:', error);
        this.reenviando = false;
      }
    });
  }

  consultarEstado(comprobante: Comprobante): void {
    this.consultando = true;
    this.facturacionService.consultarEstado(comprobante.id!).subscribe({
      next: (response) => {
        console.log('Estado consultado:', response);
        this.cargarComprobantes(); // Recargar la lista
        this.consultando = false;
      },
      error: (error) => {
        console.error('Error al consultar estado:', error);
        this.consultando = false;
      }
    });
  }

  nuevaVentaManual(): void {
    // Redirigir al POS para crear una nueva venta
    this.router.navigate(['/dashboard/pos']);
  }

  // Métodos para estadísticas
  getComprobantesAceptados(): number {
    return this.comprobantes.filter(c => c.estado_sunat === 'ACEPTADO').length;
  }

  getComprobantesPendientes(): number {
    return this.comprobantes.filter(c => c.estado_sunat === 'PENDIENTE').length;
  }

  getComprobantesRechazados(): number {
    return this.comprobantes.filter(c => c.estado_sunat === 'RECHAZADO').length;
  }
}