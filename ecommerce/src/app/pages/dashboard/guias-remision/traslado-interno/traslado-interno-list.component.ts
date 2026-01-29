import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuiasRemisionService, GuiaRemision } from '../../../../services/guias-remision.service';
import { GuiaRemisionModalComponent } from '../../../../components/guia-remision-modal/guia-remision-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-traslado-interno-list',
  standalone: true,
  imports: [CommonModule, FormsModule, GuiaRemisionModalComponent],
  template: `
    <div class="gre-container">
      <div class="gre-header">
        <div class="gre-title">
          <h5>Traslados Internos</h5>
          <p>Movimientos entre almacenes de la misma empresa</p>
        </div>
        <div class="gre-actions">
          <button class="gre-btn-primary" (click)="nuevaGuia()">
            <i class="ph ph-plus"></i>
            Nuevo Traslado Interno
          </button>
        </div>
      </div>

      <!-- Alerta informativa -->
      <div class="gre-alert alert-secondary mb-24">
        <i class="ph ph-info"></i>
        <strong>Traslado Interno:</strong> No requiere envío a SUNAT. Solo para control interno entre almacenes.
      </div>

      <!-- Estadísticas -->
      <div class="gre-stats">
        <div class="row g-4">
          <div class="col-md-4">
            <div class="stat-card stat-total">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-file-text"></i>
                  </div>
                  <div>
                    <p class="stat-label">Total</p>
                    <h6 class="stat-value">{{ totalGuias }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-card stat-pending">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-clock"></i>
                  </div>
                  <div>
                    <p class="stat-label">Pendientes</p>
                    <h6 class="stat-value">{{ guiasPendientes }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="stat-card stat-weight">
              <div class="card-body">
                <div class="d-flex align-items-center gap-12">
                  <div class="stat-icon">
                    <i class="ph ph-package"></i>
                  </div>
                  <div>
                    <p class="stat-label">Peso Total (kg)</p>
                    <h6 class="stat-value">{{ pesoTotal | number:'1.2-2' }}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="gre-filters">
        <div class="card-body">
          <div class="row">
            <div class="col-md-5 mb-16">
              <label class="form-label">Búsqueda</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="filtroBusqueda"
                placeholder="Buscar por número o destinatario..."
                (input)="aplicarFiltros()">
            </div>
            <div class="col-md-3 mb-16">
              <label class="form-label">Fecha Inicio</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="filtroFechaInicio"
                (change)="aplicarFiltros()">
            </div>
            <div class="col-md-2 mb-16">
              <label class="form-label">Fecha Fin</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="filtroFechaFin"
                (change)="aplicarFiltros()">
            </div>
            <div class="col-md-2 mb-16">
              <label class="form-label">Acciones</label>
              <div class="d-grid">
                <button
                  class="gre-btn-secondary"
                  (click)="limpiarFiltros()">
                  <i class="ph ph-broom"></i>
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="gre-table-card">
        <div class="card-body">
          <div *ngIf="loading" class="gre-loading">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p>Cargando traslados...</p>
          </div>

          <div *ngIf="error" class="gre-alert alert-danger">
            <i class="ph ph-warning"></i>{{ error }}
          </div>

          <div *ngIf="!loading && !error" class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Peso (kg)</th>
                  <th>Bultos</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let guia of guias">
                  <td class="td-number">{{ guia.numero_completo }}</td>
                  <td>{{ guia.fecha_emision | date:'dd/MM/yyyy' }}</td>
                  <td>{{ guia.punto_partida_direccion || 'N/A' }}</td>
                  <td>{{ guia.punto_llegada_direccion || 'N/A' }}</td>
                  <td>{{ guia.peso_total | number:'1.2-2' }}</td>
                  <td>{{ guia.numero_bultos }}</td>
                  <td>
                    <div class="gre-actions-group">
                      <button
                        class="gre-btn-action btn-view"
                        title="Ver Detalle"
                        (click)="verDetalle(guia)">
                        <i class="ph ph-eye"></i>
                      </button>
                      <button
                        class="gre-btn-action btn-delete"
                        title="Eliminar"
                        (click)="eliminar(guia)">
                        <i class="ph ph-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div *ngIf="guias.length === 0" class="gre-empty">
              <i class="ph ph-file-text"></i>
              <h6>No hay traslados internos</h6>
              <p>No se encontraron traslados con los filtros aplicados</p>
              <button class="btn btn-primary" (click)="nuevaGuia()">
                <i class="ph ph-plus me-2"></i>
                Crear Primer Traslado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-guia-remision-modal
      [isOpen]="mostrarModal"
      [tipoGuiaPredefinido]="'INTERNO'"
      (onClose)="cerrarModal()"
      (onSuccess)="onGuiaCreada($event)">
    </app-guia-remision-modal>
  `
})
export class TrasladoInternoListComponent implements OnInit {
  guias: GuiaRemision[] = [];
  loading = false;
  error = '';
  mostrarModal = false;

  filtroBusqueda = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  totalGuias = 0;
  guiasPendientes = 0;
  pesoTotal = 0;

  constructor(
    private guiasService: GuiasRemisionService
  ) {}

  ngOnInit(): void {
    this.cargarGuias();
  }

  cargarGuias(): void {
    this.loading = true;
    this.error = '';

    const filtros: any = {
      tipo_guia: 'INTERNO',
      fecha_inicio: this.filtroFechaInicio,
      fecha_fin: this.filtroFechaFin
    };

    this.guiasService.getGuias(filtros).subscribe({
      next: (response) => {
        this.guias = response.data?.data || response.data || [];
        // Construir numero_completo si no viene del backend
        this.guias = this.guias.map(guia => ({
          ...guia,
          numero_completo: guia.numero_completo || `${guia.serie}-${String(guia.correlativo).padStart(8, '0')}`
        }));
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar traslados';
        this.loading = false;
      }
    });
  }

  calcularEstadisticas(): void {
    this.totalGuias = this.guias.length;
    this.guiasPendientes = this.guias.filter(g => g.estado === 'PENDIENTE').length;
    this.pesoTotal = this.guias.reduce((sum, g) => sum + parseFloat(g.peso_total?.toString() || '0'), 0);
  }

  aplicarFiltros(): void {
    this.cargarGuias();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.cargarGuias();
  }

  nuevaGuia(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onGuiaCreada(_guia: any): void {
    this.cargarGuias();
    Swal.fire('Éxito', 'Traslado interno creado exitosamente', 'success');
  }

  verDetalle(guia: GuiaRemision): void {
    Swal.fire({
      title: 'Detalle de Traslado Interno',
      html: `
        <div class="text-start">
          <p><strong>Número:</strong> ${guia.numero_completo}</p>
          <p><strong>Fecha:</strong> ${guia.fecha_emision}</p>
          <p><strong>Origen:</strong> ${guia.punto_partida_direccion || 'N/A'}</p>
          <p><strong>Destino:</strong> ${guia.punto_llegada_direccion || 'N/A'}</p>
          <p><strong>Peso Total:</strong> ${guia.peso_total} kg</p>
          <p><strong>Bultos:</strong> ${guia.numero_bultos}</p>
          ${guia.observaciones ? `<p><strong>Observaciones:</strong> ${guia.observaciones}</p>` : ''}
        </div>
      `,
      icon: 'info'
    });
  }

  eliminar(guia: GuiaRemision): void {
    // Validar que se pueda eliminar
    if (guia.estado !== 'PENDIENTE') {
      Swal.fire({
        title: 'No se puede eliminar',
        text: 'Solo se pueden eliminar guías en estado PENDIENTE',
        icon: 'warning'
      });
      return;
    }

    if (guia.tiene_xml || guia.tiene_cdr) {
      Swal.fire({
        title: 'No se puede eliminar',
        html: `
          <p>Esta guía ya fue enviada a SUNAT.</p>
          <p class="text-muted small">Debe anularla mediante el proceso oficial de comunicación de baja.</p>
        `,
        icon: 'warning'
      });
      return;
    }

    Swal.fire({
      title: '¿Eliminar traslado?',
      html: `
        <p>¿Está seguro de eliminar el traslado <strong>${guia.numero_completo}</strong>?</p>
        <p class="text-danger small"><i class="ph ph-warning"></i> Esta acción no se puede deshacer</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && guia.id) {
        this.guiasService.eliminarGuia(guia.id).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Eliminado',
              text: response.message || 'Traslado eliminado correctamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarGuias();
          },
          error: (err) => {
            const mensaje = err?.error?.message || 'No se pudo eliminar el traslado';
            Swal.fire({
              title: 'Error al eliminar',
              text: mensaje,
              icon: 'error'
            });
          }
        });
      }
    });
  }
}
