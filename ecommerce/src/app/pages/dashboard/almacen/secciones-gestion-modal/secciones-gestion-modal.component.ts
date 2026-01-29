import { Component, OnInit, Output, EventEmitter } from "@angular/core"
import { CommonModule } from "@angular/common"
import { AlmacenService } from "../../../../services/almacen.service"
import { Seccion } from "../../../../types/almacen.types"
import { SeccionModalComponent } from "../seccion-modal/seccion-modal.component"
import { PermissionsService } from '../../../../services/permissions.service';
import Swal from "sweetalert2"

@Component({
  selector: "app-secciones-gestion-modal",
  standalone: true,
  imports: [CommonModule, SeccionModalComponent],
  template: `
    <!-- Modal de Gestión de Secciones -->
    <div class="modal fade" id="modalGestionSecciones" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              <i class="ph ph-folders me-8"></i>
              Gestión de Secciones
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <div class="d-flex justify-content-between align-items-center mb-16">
              <p class="text-gray-600 mb-0">Administra las secciones del sistema (máximo 3)</p>
              <button class="btn bg-success-600 hover-bg-success-700 text-white px-12 py-6 rounded-6"
                      [disabled]="secciones.length >= 3"
                      data-bs-toggle="modal" 
                      data-bs-target="#modalCrearSeccion">
                <i class="ph ph-plus me-6"></i>
                Nueva Sección
              </button>
            </div>

            <!-- Loading state -->
            <div *ngIf="isLoading" class="text-center py-40">
              <div class="spinner-border text-main-600" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="text-gray-500 mt-12 mb-0">Cargando secciones...</p>
            </div>

            <!-- Tabla de secciones -->
            <div *ngIf="!isLoading" class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-16 py-12 text-heading fw-semibold border-0">Nombre</th>
                    <th class="px-16 py-12 text-heading fw-semibold border-0">Descripción</th>
                    <th class="px-16 py-12 text-heading fw-semibold border-0">Categorías</th>
                    <th class="px-16 py-12 text-heading fw-semibold border-0 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let seccion of secciones" class="border-bottom border-gray-100">
                    <!-- Nombre -->
                    <td class="px-16 py-12">
                      <h6 class="text-heading fw-semibold mb-0">{{ seccion.nombre }}</h6>
                    </td>

                    <!-- Descripción -->
                    <td class="px-16 py-12">
                      <p class="text-gray-600 mb-0" [title]="seccion.descripcion">
                        {{ seccion.descripcion ? (seccion.descripcion.length > 40 ? seccion.descripcion.substring(0, 40) + '...' : seccion.descripcion) : 'Sin descripción' }}
                      </p>
                    </td>

                    <!-- Categorías -->
                    <td class="px-16 py-12">
                      <span class="badge bg-main-50 text-main-600 px-8 py-4 rounded-pill fw-medium">
                        {{ seccion.categorias_count || 0 }} categorías
                      </span>
                    </td>

                    <!-- Acciones -->
                    <td class="px-16 py-12 text-center">
                      <div class="d-flex justify-content-center gap-6">
                        <!-- Editar -->
                        <button class="btn bg-main-50 hover-bg-main-100 text-main-600 w-28 h-28 rounded-6 flex-center transition-2"
                                *ngIf="seccion && canEdit"
                                title="Editar"
                                (click)="editarSeccion(seccion)">
                          <i class="ph ph-pencil text-xs"></i>
                        </button>

                        <!-- Eliminar -->
                        <button class="btn bg-danger-50 hover-bg-danger-100 text-danger-600 w-28 h-28 rounded-6 flex-center transition-2"
                                *ngIf="seccion && canDelete"       
                                title="Eliminar"
                                [disabled]="(seccion.categorias_count || 0) > 0"
                                (click)="eliminarSeccion(seccion)">
                          <i class="ph ph-trash text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Empty state -->
              <div *ngIf="secciones.length === 0" class="text-center py-40">
                <i class="ph ph-folders text-gray-300 text-4xl mb-16"></i>
                <h6 class="text-heading fw-semibold mb-8">No hay secciones</h6>
                <p class="text-gray-500 mb-16">Crea tu primera sección para organizar las categorías</p>
                <button class="btn bg-success-600 hover-bg-success-700 text-white px-16 py-8 rounded-8"
                        data-bs-toggle="modal" 
                        data-bs-target="#modalCrearSeccion">
                  <i class="ph ph-plus me-8"></i>
                  Crear primera sección
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear/editar sección -->
    <app-seccion-modal 
      [seccion]="seccionSeleccionada"
      (seccionGuardada)="onSeccionGuardada()"
      (modalCerrado)="onModalCerrado()">
    </app-seccion-modal>
  `
})
export class SeccionesGestionModalComponent implements OnInit {
  @Output() seccionesActualizadas = new EventEmitter<void>()

  secciones: Seccion[] = []
  isLoading = true
  seccionSeleccionada: Seccion | null = null
  // Nuevas propiedades para permisos
  canEdit = false
  canDelete = false


  constructor(
    private almacenService: AlmacenService,
    public permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarSecciones()
    // Verificar permisos
    this.canEdit = this.permissionsService.canEditSecciones()
    this.canDelete = this.permissionsService.canDeleteSecciones()
  }

  cargarSecciones(): void {
    this.isLoading = true
    this.almacenService.obtenerSecciones().subscribe({
      next: (secciones) => {
        this.secciones = secciones
        this.isLoading = false
      },
      error: (error) => {
        console.error("Error al cargar secciones:", error)
        this.isLoading = false
      },
    })
  }

  editarSeccion(seccion: Seccion): void {
    this.seccionSeleccionada = seccion
    const modal = document.getElementById("modalCrearSeccion")
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal)
      bootstrapModal.show()
    }
  }

  eliminarSeccion(seccion: Seccion): void {
    if ((seccion.categorias_count || 0) > 0) {
      Swal.fire({
        title: "No se puede eliminar",
        text: "Esta sección tiene categorías asociadas. Migra las categorías a otra sección antes de eliminarla.",
        icon: "warning",
        confirmButtonColor: "#6c757d",
        customClass: {
          popup: "rounded-12",
          confirmButton: "rounded-8",
        },
      })
      return
    }

    Swal.fire({
      title: "¿Eliminar sección?",
      html: `Estás a punto de eliminar la sección <strong>"${seccion.nombre}"</strong>.<br>Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-12",
        confirmButton: "rounded-8",
        cancelButton: "rounded-8",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.almacenService.eliminarSeccion(seccion.id).subscribe({
          next: () => {
            Swal.fire({
              title: "¡Eliminada!",
              text: "La sección ha sido eliminada exitosamente.",
              icon: "success",
              confirmButtonColor: "#198754",
              customClass: {
                popup: "rounded-12",
                confirmButton: "rounded-8",
              },
            })
            this.cargarSecciones()
            this.seccionesActualizadas.emit()
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo eliminar la sección. Inténtalo de nuevo.",
              icon: "error",
              confirmButtonColor: "#dc3545",
              customClass: {
                popup: "rounded-12",
                confirmButton: "rounded-8",
              },
            })
            console.error("Error al eliminar sección:", error)
          },
        })
      }
    })
  }

  onSeccionGuardada(): void {
    this.cargarSecciones()
    this.seccionSeleccionada = null
    this.seccionesActualizadas.emit()
  }

  onModalCerrado(): void {
    this.seccionSeleccionada = null
  }
}