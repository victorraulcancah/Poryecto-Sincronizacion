import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import { Serie, ApiResponse } from '../../../../models/facturacion.model';
import { SerieFormModalComponent } from '../../../../components/serie-form-modal/serie-form-modal.component';

@Component({
  selector: 'app-series-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SerieFormModalComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Series de Comprobantes</h5>
        <p class="text-gray-500 mb-0">Administra las series para facturación electrónica</p>
      </div>
      <button 
        class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
        (click)="abrirModalNuevaSerie()">
        <i class="ph ph-plus me-8"></i>
        Nueva Serie
      </button>
    </div>

    <!-- Filtros -->
    <div class="card border-0 shadow-sm rounded-12 mb-24">
      <div class="card-body p-24">
        <div class="row">
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Tipo de Comprobante</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroTipo" (change)="aplicarFiltros()">
              <option value="">Todos los tipos</option>
              <option value="01">Factura (F001)</option>
              <option value="03">Boleta (B001)</option>
              <option value="07">Nota de Crédito (NC)</option>
              <option value="08">Nota de Débito (ND)</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Estado</label>
            <select class="form-select px-16 py-12 border rounded-8" [(ngModel)]="filtroEstado" (change)="aplicarFiltros()">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div class="col-md-3 mb-16">
            <label class="form-label text-heading fw-medium mb-8">Buscar</label>
            <div class="input-group">
              <input 
                type="text" 
                class="form-control px-16 py-12 border rounded-start-8"
                placeholder="Serie, código..."
                [(ngModel)]="filtroBusqueda"
                (input)="aplicarFiltros()">
              <button 
                type="button" 
                class="btn bg-main-600 text-white px-16 rounded-end-8"
                (click)="cargarSeries()">
                <i class="ph ph-magnifying-glass"></i>
              </button>
            </div>
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

    <!-- Tabla de series -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-0">
        
        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-40">
          <div class="spinner-border text-main-600" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-gray-500 mt-12 mb-0">Cargando series...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="alert alert-danger mx-24 mt-24" role="alert">
          <i class="ph ph-exclamation-triangle me-8"></i>
          {{ error }}
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !error" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Tipo</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Serie</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Correlativo</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of series" class="border-bottom border-gray-100">
                <!-- Tipo -->
                <td class="px-24 py-16">
                  <span class="badge bg-info-50 text-info-600 px-12 py-6 rounded-pill fw-medium">
                    {{ getTipoComprobante(s.tipo_comprobante) }}
                  </span>
                </td>

                <!-- Serie -->
                <td class="px-24 py-16">
                  <span class="text-heading fw-semibold">{{ s.serie }}</span>
                </td>

                <!-- Correlativo -->
                <td class="px-24 py-16">
                  <div class="d-flex align-items-center gap-8">
                    <span class="text-heading fw-semibold">{{ s.correlativo_actual || 0 }}</span>
                    <small class="text-gray-500">/ ∞</small>
                  </div>
                </td>

                <!-- Estado -->
                <td class="px-24 py-16">
                  <span class="badge px-12 py-6 rounded-pill fw-medium"
                        [ngClass]="getEstadoClass(s.estado || 'inactivo')">
                    {{ s.estado | titlecase }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-24 py-16 text-center">
                  <div class="d-flex justify-content-center gap-8">
                    <!-- Reservar Correlativo -->
                    <button 
                      class="btn bg-success-50 hover-bg-success-100 text-success-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Reservar Correlativo"
                      (click)="reservarCorrelativo(s)" 
                      [disabled]="reservando || s.estado !== 'activo'">
                      <i class="ph ph-plus text-sm"></i>
                    </button>

                    <!-- Editar -->
                    <button 
                      class="btn bg-info-50 hover-bg-info-100 text-info-600 w-32 h-32 rounded-6 flex-center transition-2"
                      title="Editar Serie"
                      (click)="editarSerie(s)">
                      <i class="ph ph-pencil text-sm"></i>
                    </button>

                    <!-- Activar/Desactivar -->
                    <button 
                      class="btn w-32 h-32 rounded-6 flex-center transition-2"
                      [ngClass]="s.estado === 'activo' ? 'bg-warning-50 hover-bg-warning-100 text-warning-600' : 'bg-success-50 hover-bg-success-100 text-success-600'"
                      [title]="s.estado === 'activo' ? 'Desactivar Serie' : 'Activar Serie'"
                      (click)="toggleEstado(s)">
                      <i class="ph text-sm" [ngClass]="s.estado === 'activo' ? 'ph-pause' : 'ph-play'"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty state -->
          <div *ngIf="series.length === 0" class="text-center py-40">
            <i class="ph ph-barcode text-gray-300 text-6xl mb-16"></i>
            <h6 class="text-heading fw-semibold mb-8">No hay series</h6>
            <p class="text-gray-500 mb-16">No se encontraron series con los filtros aplicados.</p>
            <button 
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              (click)="abrirModalNuevaSerie()">
              <i class="ph ph-plus me-8"></i>
              Crear Primera Serie
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear/editar serie -->
    <app-serie-form-modal 
      [mostrar]="mostrarModalSerie"
      [serie]="serieSeleccionada"
      (cerrarModal)="cerrarModalSerie()"
      (serieGuardada)="onSerieGuardada($event)">
    </app-serie-form-modal>
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
export class SeriesListComponent implements OnInit {
  series: Serie[] = [];
  loading = false;
  error = '';
  reservando = false;
  
  // Filtros
  filtroTipo = '';
  filtroEstado = '';
  filtroBusqueda = '';
  
  // Modal
  mostrarModalSerie = false;
  serieSeleccionada: Serie | null = null;

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    this.cargarSeries();
  }

  cargarSeries(): void {
    this.loading = true;
    this.error = '';
    
    const filtros = {
      tipo: this.filtroTipo,
      estado: this.filtroEstado,
      busqueda: this.filtroBusqueda
    };

    this.facturacionService.getSeries(filtros).subscribe({
      next: (res: ApiResponse<Serie[]>) => {
        this.series = res.data || [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar series';
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarSeries();
  }

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroBusqueda = '';
    this.cargarSeries();
  }

  getTipoComprobante(tipo: string): string {
    const tipos: { [key: string]: string } = {
      '01': 'Factura (F001)',
      '03': 'Boleta (B001)',
      '07': 'Nota Crédito (NC)',
      '08': 'Nota Débito (ND)'
    };
    return tipos[tipo] || tipo;
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'activo':
        return 'bg-success-50 text-success-600';
      case 'inactivo':
        return 'bg-danger-50 text-danger-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  reservarCorrelativo(serie: Serie): void {
    if (!serie.id) return;
    this.reservando = true;
    
    this.facturacionService.reservarCorrelativo(serie.id).subscribe({
      next: (res) => {
        this.reservando = false;
        this.cargarSeries(); // Recargar para ver correlativo actualizado
        console.log('Correlativo reservado:', res.data);
      },
      error: (e) => {
        this.error = 'Error al reservar correlativo';
        this.reservando = false;
      }
    });
  }

  toggleEstado(serie: Serie): void {
    if (!serie.id) return;
    
    const nuevoEstado = serie.estado === 'activo' ? 'inactivo' : 'activo';
    
    // Aquí deberías llamar al servicio para actualizar el estado
    // Por ahora solo actualizamos localmente
    serie.estado = nuevoEstado;
    this.cargarSeries();
  }

  abrirModalNuevaSerie(): void {
    this.serieSeleccionada = null;
    this.mostrarModalSerie = true;
  }

  editarSerie(serie: Serie): void {
    this.serieSeleccionada = serie;
    this.mostrarModalSerie = true;
  }

  cerrarModalSerie(): void {
    this.mostrarModalSerie = false;
    this.serieSeleccionada = null;
  }

  onSerieGuardada(serie: Serie): void {
    this.cargarSeries(); // Recargar lista
  }
}