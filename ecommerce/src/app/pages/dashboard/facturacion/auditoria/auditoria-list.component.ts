import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import { AuditoriaSunat, PaginatedResponse } from '../../../../models/facturacion.model';

@Component({
  selector: 'app-auditoria-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Auditoría SUNAT</h5>
        <p class="text-gray-500 mb-0">Registro de todas las operaciones realizadas con SUNAT</p>
      </div>
      <div class="d-flex gap-12">
        <button 
          class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
          (click)="cargarAuditoria()">
          <i class="ph ph-arrow-clockwise me-8"></i>
          Actualizar
        </button>
        <button 
          class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
          (click)="exportarAuditoria()">
          <i class="ph ph-download me-8"></i>
          Exportar
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Tipo de Operación</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroTipo" (change)="aplicarFiltros()">
              <option value="">Todos los tipos</option>
              <option value="COMPROBANTE">Comprobante</option>
              <option value="RESUMEN">Resumen</option>
              <option value="BAJA">Baja</option>
              <option value="CONSULTA">Consulta</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Estado</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
              <option value="">Todos los estados</option>
              <option value="true">Exitoso</option>
              <option value="false">Fallido</option>
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

    <!-- Estadísticas -->
    <div class="row g-4 mb-24">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-success-50 text-success-600">
                <i class="ph ph-check-circle text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Operaciones Exitosas</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.exitosas }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-danger-50 text-danger-600">
                <i class="ph ph-x-circle text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Operaciones Fallidas</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.fallidas }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-info-50 text-info-600">
                <i class="ph ph-file-invoice text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Total Operaciones</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.total }}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm rounded-12">
          <div class="card-body p-24">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-12 flex-center bg-warning-50 text-warning-600">
                <i class="ph ph-percent text-2xl"></i>
              </div>
              <div>
                <p class="text-gray-500 text-sm mb-4">Tasa de Éxito</p>
                <h6 class="text-heading fw-semibold mb-0">{{ estadisticas.tasaExito }}%</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de auditoría -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando auditoría...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger ms-16"
            (click)="cargarAuditoria()">
            <i class="ph ph-arrow-clockwise me-4"></i>
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !error" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Tipo</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Entidad</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Código SUNAT</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Fecha</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of auditoria" class="border-bottom border-gray-100">
                <!-- Tipo -->
                <td class="px-24 py-16">
                  <span class="badge bg-info-50 text-info-600 px-12 py-6 rounded-pill fw-medium">
                    {{ a.tipo_operacion }}
                  </span>
                </td>

                <!-- Entidad -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ a.entidad_referencia }}</span>
                </td>

                <!-- Código SUNAT -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ a.codigo_sunat || '-' }}</span>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="a.exitoso ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'">
                    {{ a.exitoso ? 'Exitoso' : 'Fallido' }}
                  </span>
                </td>

                <!-- Fecha -->
                <td class="px-24 py-16">
                  <span class="text-heading">{{ a.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Ver Detalle -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Ver Detalle"
                      (click)="verDetalle(a)">
                      <i class="ph ph-eye text-sm"></i>
                    </button>

                    <!-- Ver Log -->
                    <button 
                      class="btn bg-warning-50 hover-bg-warning-100 text-warning-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Ver Log"
                      (click)="verLog(a)">
                      <i class="ph ph-file-text text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="auditoria.length === 0" class="text-center py-40">
            <i class="ph ph-clipboard-text text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay registros de auditoría</h6>
            <p class="text-gray-500 mb-16">No se encontraron registros de auditoría con los filtros aplicados.</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="cargarAuditoria()">
              <i class="ph ph-arrow-clockwise me-8"></i>
              Actualizar
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
export class AuditoriaListComponent implements OnInit {
  auditoria: AuditoriaSunat[] = [];
  loading = false;
  error = '';
  
  // Filtros
  filtroTipo = '';
  filtroEstado = '';
  filtroFechaInicio = '';
  
  // Estadísticas
  estadisticas = {
    exitosas: 0,
    fallidas: 0,
    total: 0,
    tasaExito: 0
  };

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    this.cargarAuditoria();
  }

  cargarAuditoria(): void {
    this.loading = true;
    this.error = '';
    
    const filtros = {
      tipo: this.filtroTipo,
      exitoso: this.filtroEstado,
      fecha_inicio: this.filtroFechaInicio,
      page: 1
    };

    this.facturacionService.getAuditoria(filtros).subscribe({
      next: (res: PaginatedResponse<AuditoriaSunat>) => {
        this.auditoria = res.data || [];
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar auditoría';
        this.loading = false;
        console.error('Error al cargar auditoría:', e);
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarAuditoria();
  }

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.cargarAuditoria();
  }

  calcularEstadisticas(): void {
    const exitosas = this.auditoria.filter(a => a.exitoso).length;
    const fallidas = this.auditoria.filter(a => !a.exitoso).length;
    const total = this.auditoria.length;
    const tasaExito = total > 0 ? Math.round((exitosas / total) * 100) : 0;
    
    this.estadisticas = {
      exitosas,
      fallidas,
      total,
      tasaExito
    };
  }

  verDetalle(auditoria: AuditoriaSunat): void {
    // Implementar modal de detalle
    console.log('Ver detalle:', auditoria);
  }

  verLog(auditoria: AuditoriaSunat): void {
    // Implementar visualización de log
    console.log('Ver log:', auditoria);
  }

  exportarAuditoria(): void {
    // Implementar exportación
    console.log('Exportar auditoría');
  }
}