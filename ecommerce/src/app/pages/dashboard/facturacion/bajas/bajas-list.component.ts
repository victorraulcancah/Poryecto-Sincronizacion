import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import { Baja, PaginatedResponse } from '../../../../models/facturacion.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bajas-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Comunicaciones de Baja</h5>
        <p class="text-gray-500 mb-0">Administra las comunicaciones de baja de comprobantes para SUNAT</p>
      </div>
      <button 
        class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
        (click)="crearBaja()"
        [disabled]="creando">
        <i class="ph ph-plus me-8"></i>
        <span *ngIf="!creando">Crear Baja</span>
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

    <!-- Tabla de bajas -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando comunicaciones de baja...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger ms-16"
            (click)="cargarBajas()">
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
                <th class="px-24 py-16 text-heading fw-semibold border-0">Fecha Baja</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Ticket</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of bajas" class="border-bottom border-gray-100">
                <!-- Identificador -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ b.identificador }}</span>
                </td>

                <!-- Fecha Baja -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ b.fecha_baja }}</span>
                </td>

                <!-- Ticket -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ b.ticket || '-' }}</span>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="getEstadoClass(b.estado)">
                    {{ b.estado | titlecase }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Ver Detalle -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Ver Detalle"
                      (click)="verDetalle(b)">
                      <i class="ph ph-eye text-sm"></i>
                    </button>

                    <!-- Consultar Estado -->
                    <button 
                      class="btn bg-primary-50 hover-bg-primary-100 text-primary-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Consultar Estado"
                      (click)="consultarEstado(b)" 
                      [disabled]="consultando">
                      <i class="ph ph-magnifying-glass text-sm"></i>
                    </button>

                    <!-- Descargar -->
                    <button 
                      class="btn bg-success-50 hover-bg-success-100 text-success-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Descargar"
                      (click)="descargarBaja(b)" 
                      [disabled]="descargando">
                      <i class="ph ph-download text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="bajas.length === 0" class="text-center py-40">
            <i class="ph ph-file-x text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay comunicaciones de baja</h6>
            <p class="text-gray-500 mb-16">No se encontraron comunicaciones de baja con los filtros aplicados.</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="crearBaja()"
              [disabled]="creando">
              <i class="ph ph-plus me-8"></i>
              Crear Primera Baja
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
export class BajasListComponent implements OnInit {
  bajas: Baja[] = [];
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
    this.cargarBajas();
  }

  cargarBajas(): void {
    this.loading = true;
    this.error = '';
    
    const filtros = {
      estado: this.filtroEstado,
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin,
      page: 1
    };

    this.facturacionService.getBajas(filtros).subscribe({
      next: (res: PaginatedResponse<Baja>) => {
        this.bajas = res.data || [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar comunicaciones de baja';
        this.loading = false;
        console.error('Error al cargar bajas:', e);
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarBajas();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.cargarBajas();
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

  crearBaja(): void {
    const fecha = new Date().toISOString().split('T')[0];
    this.creando = true;
    
    Swal.fire({
      title: '¿Crear comunicación de baja?',
      text: `¿Desea crear una comunicación de baja para la fecha ${fecha}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Crear baja con comprobantes vacíos (por ahora)
        const datosBaja = {
          fecha_baja: fecha,
          comprobantes: []
        };
        
        this.facturacionService.enviarBaja(datosBaja).subscribe({
          next: (response) => {
            this.creando = false;
            this.cargarBajas(); // Recargar lista
            Swal.fire('Éxito', 'Comunicación de baja creada correctamente.', 'success');
            console.log('Baja creada:', response.data);
          },
          error: (e) => {
            this.creando = false;
            this.error = 'Error al crear comunicación de baja';
            Swal.fire('Error', 'No se pudo crear la comunicación de baja.', 'error');
            console.error('Error al crear baja:', e);
          }
        });
      } else {
        this.creando = false;
      }
    });
  }

  verDetalle(baja: Baja): void {
    Swal.fire({
      title: 'Detalle de la Comunicación de Baja',
      html: `
        <div class="text-start">
          <p><strong>Identificador:</strong> ${baja.identificador}</p>
          <p><strong>Fecha de Baja:</strong> ${baja.fecha_baja}</p>
          <p><strong>Ticket:</strong> ${baja.ticket || 'N/A'}</p>
          <p><strong>Estado:</strong> ${baja.estado}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }

  consultarEstado(baja: Baja): void {
    if (!baja.id) return;
    
    this.consultando = true;
    this.facturacionService.consultarEstadoBaja(baja.id.toString()).subscribe({
      next: (res) => {
        this.consultando = false;
        Swal.fire('Estado Consultado', 'El estado de la comunicación de baja ha sido actualizado.', 'success');
        this.cargarBajas();
      },
      error: (e) => {
        this.consultando = false;
        Swal.fire('Error', 'No se pudo consultar el estado de la comunicación de baja.', 'error');
        console.error('Error al consultar estado:', e);
      }
    });
  }

  descargarBaja(baja: Baja): void {
    if (!baja.id) return;
    
    this.descargando = true;
    // Aquí deberías implementar la descarga de la baja
    // Por ahora solo mostramos un mensaje
    setTimeout(() => {
      this.descargando = false;
      Swal.fire('Descarga', 'Funcionalidad de descarga en desarrollo.', 'info');
    }, 1000);
  }
}