import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiciosService } from '../../../services/servicios.service';
import { Servicio } from '../../../models/servicio.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-servicios-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="servicios-container">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-1">Gestión de Servicios</h4>
          <p class="text-muted mb-0">Administra los servicios que ofreces a tus clientes</p>
        </div>
        <button class="btn btn-primary" (click)="abrirModalNuevo()">
          <i class="ph ph-plus me-2"></i>
          Nuevo Servicio
        </button>
      </div>

      <!-- Filtros -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="filtros.search"
                (input)="aplicarFiltros()"
                placeholder="Buscar por código o nombre...">
            </div>
            <div class="col-md-3">
              <select class="form-select" [(ngModel)]="filtros.activo" (change)="aplicarFiltros()">
                <option [ngValue]="undefined">Todos los estados</option>
                <option [ngValue]="true">Activos</option>
                <option [ngValue]="false">Inactivos</option>
              </select>
            </div>
            <div class="col-md-3">
              <button class="btn btn-outline-secondary w-100" (click)="limpiarFiltros()">
                <i class="ph ph-x me-2"></i>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2 text-muted">Cargando servicios...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-danger">
        <i class="ph ph-warning me-2"></i>
        {{ error }}
      </div>

      <!-- Tabla de servicios -->
      <div *ngIf="!loading && !error" class="card">
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>U. Medida</th>
                  <th>IGV</th>
                  <th>Estado</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let servicio of servicios">
                  <td>
                    <code>{{ servicio.codigo_servicio }}</code>
                  </td>
                  <td>
                    <strong>{{ servicio.nombre }}</strong>
                  </td>
                  <td>
                    <small class="text-muted">{{ servicio.descripcion || '-' }}</small>
                  </td>
                  <td>
                    <strong class="text-success">S/ {{ servicio.precio | number:'1.2-2' }}</strong>
                  </td>
                  <td>
                    <span class="badge bg-secondary">{{ servicio.unidad_medida || 'ZZ' }}</span>
                  </td>
                  <td>
                    <span *ngIf="servicio.mostrar_igv" class="badge bg-info">
                      <i class="ph ph-check"></i> Con IGV
                    </span>
                    <span *ngIf="!servicio.mostrar_igv" class="badge bg-secondary">
                      Sin IGV
                    </span>
                  </td>
                  <td>
                    <span class="badge" [class.bg-success]="servicio.activo" [class.bg-danger]="!servicio.activo">
                      {{ servicio.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" (click)="editarServicio(servicio)" title="Editar">
                      <i class="ph ph-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" (click)="eliminarServicio(servicio)" title="Eliminar">
                      <i class="ph ph-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="servicios.length === 0">
                  <td colspan="8" class="text-center py-5">
                    <i class="ph ph-package display-4 text-muted"></i>
                    <p class="text-muted mt-2">No hay servicios registrados</p>
                    <button class="btn btn-primary" (click)="abrirModalNuevo()">
                      <i class="ph ph-plus me-2"></i>
                      Crear primer servicio
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div *ngIf="paginacion && paginacion.total > paginacion.per_page" class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
              Mostrando {{ servicios.length }} de {{ paginacion.total }} servicios
            </div>
            <nav>
              <ul class="pagination mb-0">
                <li class="page-item" [class.disabled]="paginacion.current_page === 1">
                  <button class="page-link" (click)="cambiarPagina(paginacion.current_page - 1)">
                    Anterior
                  </button>
                </li>
                <li class="page-item active">
                  <span class="page-link">{{ paginacion.current_page }}</span>
                </li>
                <li class="page-item" [class.disabled]="paginacion.current_page === paginacion.last_page">
                  <button class="page-link" (click)="cambiarPagina(paginacion.current_page + 1)">
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Crear/Editar Servicio -->
    <div class="modal fade" [class.show]="mostrarModal" [style.display]="mostrarModal ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="ph ph-briefcase me-2"></i>
              {{ servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio' }}
            </h5>
            <button type="button" class="btn-close" (click)="cerrarModal()"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Código del Servicio *</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="formulario.codigo_servicio"
                    name="codigo_servicio"
                    placeholder="SERV-001">
                  <small class="text-muted">Código único para identificar el servicio</small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Unidad de Medida *</label>
                  <select class="form-select" [(ngModel)]="formulario.unidad_medida" name="unidad_medida">
                    <option value="ZZ">ZZ - Servicio</option>
                    <option value="HUR">HUR - Hora</option>
                    <option value="DAY">DAY - Día</option>
                    <option value="MON">MON - Mes</option>
                    <option value="NIU">NIU - Unidad</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Nombre del Servicio *</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="formulario.nombre"
                    name="nombre"
                    placeholder="Ej: Consultoría IT, Instalación de Software">
                </div>
                <div class="col-12">
                  <label class="form-label">Descripción</label>
                  <textarea 
                    class="form-control" 
                    [(ngModel)]="formulario.descripcion"
                    name="descripcion"
                    rows="3"
                    placeholder="Descripción detallada del servicio"></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Precio *</label>
                  <div class="input-group">
                    <span class="input-group-text">S/</span>
                    <input 
                      type="number" 
                      class="form-control" 
                      [(ngModel)]="formulario.precio"
                      name="precio"
                      step="0.01"
                      min="0"
                      placeholder="0.00">
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Tipo de Afectación IGV *</label>
                  <select class="form-select" [(ngModel)]="formulario.tipo_afectacion_igv" name="tipo_afectacion_igv">
                    <option value="10">10 - Gravado</option>
                    <option value="20">20 - Exonerado</option>
                    <option value="30">30 - Inafecto</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      [(ngModel)]="formulario.mostrar_igv"
                      name="mostrar_igv"
                      id="mostrar_igv">
                    <label class="form-check-label" for="mostrar_igv">
                      Mostrar IGV en comprobante
                    </label>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      [(ngModel)]="formulario.activo"
                      name="activo"
                      id="activo">
                    <label class="form-check-label" for="activo">
                      Servicio activo
                    </label>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrarModal()">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" (click)="guardarServicio()" [disabled]="guardando">
              <span *ngIf="guardando" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!guardando" class="ph ph-check me-2"></i>
              {{ guardando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade" [class.show]="mostrarModal" *ngIf="mostrarModal"></div>
  `,
  styles: [`
    .servicios-container {
      padding: 1.5rem;
    }

    .table td {
      vertical-align: middle;
    }

    code {
      background: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .modal.show {
      display: block !important;
    }

    .modal-backdrop.show {
      opacity: 0.5;
    }
  `]
})
export class ServiciosListComponent implements OnInit {
  servicios: Servicio[] = [];
  loading = false;
  error = '';
  
  filtros = {
    search: '',
    activo: undefined as boolean | undefined,
    page: 1,
    per_page: 20
  };

  paginacion: any = null;

  // Modal
  mostrarModal = false;
  guardando = false;
  servicioEditando: Servicio | null = null;

  formulario: Partial<Servicio> = {
    codigo_servicio: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    unidad_medida: 'ZZ',
    tipo_afectacion_igv: '10',
    mostrar_igv: true,
    activo: true
  };

  constructor(private serviciosService: ServiciosService) {}

  ngOnInit(): void {
    this.cargarServicios();
  }

  cargarServicios(): void {
    this.loading = true;
    this.error = '';

    this.serviciosService.getServicios(this.filtros).subscribe({
      next: (response) => {
        this.servicios = response.data;
        this.paginacion = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total
        };
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al cargar servicios';
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.filtros.page = 1;
    this.cargarServicios();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      activo: undefined,
      page: 1,
      per_page: 20
    };
    this.cargarServicios();
  }

  cambiarPagina(pagina: number): void {
    this.filtros.page = pagina;
    this.cargarServicios();
  }

  abrirModalNuevo(): void {
    this.servicioEditando = null;
    this.formulario = {
      codigo_servicio: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      unidad_medida: 'ZZ',
      tipo_afectacion_igv: '10',
      mostrar_igv: true,
      activo: true
    };
    this.mostrarModal = true;
  }

  editarServicio(servicio: Servicio): void {
    this.servicioEditando = servicio;
    this.formulario = { ...servicio };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.servicioEditando = null;
  }

  guardarServicio(): void {
    // Validaciones
    if (!this.formulario.codigo_servicio || !this.formulario.nombre || !this.formulario.precio) {
      Swal.fire('Error', 'Complete todos los campos obligatorios', 'error');
      return;
    }

    this.guardando = true;

    const request = this.servicioEditando
      ? this.serviciosService.actualizarServicio(this.servicioEditando.id!, this.formulario)
      : this.serviciosService.crearServicio(this.formulario);

    request.subscribe({
      next: () => {
        Swal.fire(
          'Éxito',
          `Servicio ${this.servicioEditando ? 'actualizado' : 'creado'} exitosamente`,
          'success'
        );
        this.cerrarModal();
        this.cargarServicios();
        this.guardando = false;
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Error al guardar servicio', 'error');
        this.guardando = false;
      }
    });
  }

  eliminarServicio(servicio: Servicio): void {
    Swal.fire({
      title: '¿Eliminar servicio?',
      text: `Se eliminará el servicio "${servicio.nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.serviciosService.eliminarServicio(servicio.id!).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Servicio eliminado exitosamente', 'success');
            this.cargarServicios();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Error al eliminar servicio', 'error');
          }
        });
      }
    });
  }
}
