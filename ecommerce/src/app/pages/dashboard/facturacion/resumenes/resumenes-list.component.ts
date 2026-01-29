import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import { Resumen, PaginatedResponse } from '../../../../models/facturacion.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-resumenes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Resúmenes Diarios</h5>
        <p class="text-gray-500 mb-0">Administra los resúmenes diarios de comprobantes para SUNAT</p>
      </div>
      <button 
        class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
        (click)="crearResumen()"
        [disabled]="creando">
        <i class="ph ph-plus me-8"></i>
        <span *ngIf="!creando">Crear Resumen</span>
        <span *ngIf="creando">Creando...</span>
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
              <option value="ENVIADO">Enviado</option>
              <option value="ACEPTADO">Aceptado</option>
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
            <label class="form-label text-heading fw-medium mb-8">Acciones</label>
            <div class="d-grid">
              <button 
                class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
                (click)="limpiarFiltros()">
                <i class="ph ph-broom me-8"></i>
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de resúmenes -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando resúmenes...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger ms-16"
            (click)="cargarResumenes()">
            <i class="ph ph-arrow-clockwise me-4"></i>
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !error" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Identificador</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Fecha</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Ticket</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of resumenes" class="border-bottom border-gray-100">
                <!-- Identificador -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ r.identificador }}</span>
                </td>

                <!-- Fecha -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ r.fecha_resumen }}</span>
                </td>

                <!-- Ticket -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ r.ticket || '-' }}</span>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="getEstadoClass(r.estado)">
                    {{ r.estado | titlecase }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Ver Detalle -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Ver Detalle"
                      (click)="verDetalle(r)">
                      <i class="ph ph-eye text-sm"></i>
                    </button>

                    <!-- Consultar Estado -->
                    <button 
                      class="btn bg-primary-50 hover-bg-primary-100 text-primary-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Consultar Estado"
                      (click)="consultarEstado(r)" 
                      [disabled]="consultando">
                      <i class="ph ph-magnifying-glass text-sm"></i>
                    </button>

                    <!-- Descargar -->
                    <button 
                      class="btn bg-success-50 hover-bg-success-100 text-success-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Descargar"
                      (click)="descargarResumen(r)" 
                      [disabled]="descargando">
                      <i class="ph ph-download text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="resumenes.length === 0" class="text-center py-40">
            <i class="ph ph-file-text text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay resúmenes</h6>
            <p class="text-gray-500 mb-16">No se encontraron resúmenes con los filtros aplicados.</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="crearResumen()"
              [disabled]="creando">
              <i class="ph ph-plus me-8"></i>
              Crear Primer Resumen
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
      
      .flex-center {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .transition-2 {
        transition: all 0.2s ease;
      }
    `,
  ],
})
export class ResumenesListComponent implements OnInit {
  resumenes: Resumen[] = [];
  loading = false;
  error = '';
  creando = false;
  consultando = false;
  descargando = false;
  
  // Filtros
  filtroEstado = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    this.cargarResumenes();
  }

  cargarResumenes(): void {
    this.loading = true;
    this.error = '';
    
    const filtros = {
      estado: this.filtroEstado,
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin,
      page: 1
    };

    this.facturacionService.getResumenes(filtros).subscribe({
      next: (res: PaginatedResponse<Resumen>) => {
        this.resumenes = res.data || [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar resúmenes';
        this.loading = false;
        console.error('Error al cargar resúmenes:', e);
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarResumenes();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.cargarResumenes();
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACEPTADO':
        return 'bg-success-50 text-success-600';
      case 'ENVIADO':
        return 'bg-info-50 text-info-600';
      case 'RECHAZADO':
        return 'bg-danger-50 text-danger-600';
      case 'PENDIENTE':
        return 'bg-warning-50 text-warning-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  crearResumen(): void {
    const fecha = new Date().toISOString().split('T')[0];
    this.creando = true;
    
    Swal.fire({
      title: '¿Crear resumen?',
      text: `¿Desea crear un resumen diario para la fecha ${fecha}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Crear resumen con comprobantes del día (vacío por ahora)
        this.facturacionService.crearResumen(fecha, []).subscribe({
          next: (response) => {
            this.creando = false;
            this.cargarResumenes(); // Recargar lista
            Swal.fire('Éxito', 'Resumen creado correctamente.', 'success');
            console.log('Resumen creado:', response.data);
          },
          error: (e) => {
            this.creando = false;
            this.error = 'Error al crear resumen';
            Swal.fire('Error', 'No se pudo crear el resumen.', 'error');
            console.error('Error al crear resumen:', e);
          }
        });
      } else {
        this.creando = false;
      }
    });
  }

  verDetalle(resumen: Resumen): void {
    Swal.fire({
      title: 'Detalle del Resumen',
      html: `
        <div class="text-start">
          <p><strong>Identificador:</strong> ${resumen.identificador}</p>
          <p><strong>Fecha:</strong> ${resumen.fecha_resumen}</p>
          <p><strong>Ticket:</strong> ${resumen.ticket || 'N/A'}</p>
          <p><strong>Estado:</strong> ${resumen.estado}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }

  consultarEstado(resumen: Resumen): void {
    if (!resumen.id) return;
    
    this.consultando = true;
    this.facturacionService.consultarEstadoResumen(resumen.id.toString()).subscribe({
      next: (res) => {
        this.consultando = false;
        Swal.fire('Estado Consultado', 'El estado del resumen ha sido actualizado.', 'success');
        this.cargarResumenes();
      },
      error: (e) => {
        this.consultando = false;
        Swal.fire('Error', 'No se pudo consultar el estado del resumen.', 'error');
        console.error('Error al consultar estado:', e);
      }
    });
  }

  descargarResumen(resumen: Resumen): void {
    if (!resumen.id) return;
    
    this.descargando = true;
    // Aquí deberías implementar la descarga del resumen
    // Por ahora solo mostramos un mensaje
    setTimeout(() => {
      this.descargando = false;
      Swal.fire('Descarga', 'Funcionalidad de descarga en desarrollo.', 'info');
    }, 1000);
  }
}