// src\app\pages\dashboard\almacen\migrar-categoria-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { AlmacenService } from "../../../../services/almacen.service"
import { Categoria, Seccion } from "../../../../types/almacen.types"
import Swal from "sweetalert2"

@Component({
  selector: "app-migrar-categoria-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalMigrarCategoria" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              <i class="ph ph-arrows-clockwise me-8"></i>
              Migrar Categoría
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <div *ngIf="categoria" class="mb-20">
              <div class="alert alert-info border-0 bg-info-50 text-info-700 rounded-8">
                <i class="ph ph-info me-8"></i>
                Vas a migrar la categoría <strong>"{{ categoria.nombre }}"</strong> a una nueva sección.
              </div>
            </div>

            <form [formGroup]="migrarForm" (ngSubmit)="onSubmit()">
              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8">Sección Actual</label>
                <input type="text" 
                       class="form-control px-16 py-12 border rounded-8 bg-gray-50"
                       [value]="categoria?.seccion?.nombre || 'Sin sección'"
                       readonly>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8">Nueva Sección *</label>
                <select class="form-select px-16 py-12 border rounded-8"
                        [class.is-invalid]="migrarForm.get('nueva_seccion_id')?.invalid && migrarForm.get('nueva_seccion_id')?.touched"
                        formControlName="nueva_seccion_id">
                  <option value="">Seleccionar nueva sección</option>
                  <option *ngFor="let seccion of seccionesDisponibles" [value]="seccion.id">
                    {{ seccion.nombre }}
                    <span *ngIf="seccion.categorias_count">({{ seccion.categorias_count }} categorías)</span>
                  </option>
                </select>
                <div class="invalid-feedback" 
                     *ngIf="migrarForm.get('nueva_seccion_id')?.invalid && migrarForm.get('nueva_seccion_id')?.touched">
                  Selecciona una nueva sección
                </div>
              </div>
            </form>
          </div>
          
          <div class="modal-footer border-0 pt-0">
            <button type="button" 
                    class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
                    data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" 
                    class="btn bg-warning-600 hover-bg-warning-700 text-white px-16 py-8 rounded-8"
                    [disabled]="isLoading"
                    (click)="onSubmit()">
              <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-8"></span>
              <i *ngIf="!isLoading" class="ph ph-arrows-clockwise me-8"></i>
              {{ isLoading ? 'Migrando...' : 'Migrar Categoría' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MigrarCategoriaModalComponent implements OnInit, OnChanges {
  @Input() categoria: Categoria | null = null
  @Output() categoriaMigrada = new EventEmitter<void>()
  @Output() modalCerrado = new EventEmitter<void>()

  migrarForm: FormGroup
  secciones: Seccion[] = []
  seccionesDisponibles: Seccion[] = []
  isLoading = false

  constructor(
    private fb: FormBuilder,
    private almacenService: AlmacenService,
  ) {
    this.migrarForm = this.fb.group({
      nueva_seccion_id: ["", [Validators.required]],
    })
  }

  ngOnInit(): void {
    this.cargarSecciones()
  }

  ngOnChanges(): void {
    if (this.categoria) {
      this.migrarForm.reset({
        nueva_seccion_id: "",
      })
      this.filtrarSeccionesDisponibles()
    }
  }

  cargarSecciones(): void {
    this.almacenService.obtenerSecciones().subscribe({
      next: (secciones) => {
        this.secciones = secciones
        this.filtrarSeccionesDisponibles()
      },
      error: (error) => {
        console.error("Error al cargar secciones:", error)
      },
    })
  }

  filtrarSeccionesDisponibles(): void {
    if (this.categoria) {
      // Filtrar secciones excluyendo la actual
      this.seccionesDisponibles = this.secciones.filter(
        seccion => seccion.id !== this.categoria?.id_seccion
      )
    }
  }

  onSubmit(): void {
    if (this.migrarForm.valid && this.categoria) {
      this.isLoading = true

      const nuevaSeccionId = this.migrarForm.get('nueva_seccion_id')?.value

      this.almacenService.migrarCategoria(this.categoria.id, nuevaSeccionId).subscribe({
        next: (response) => {
          console.log("Categoría migrada exitosamente:", response)
          
          Swal.fire({
            title: "¡Migración exitosa!",
            text: "La categoría ha sido migrada a la nueva sección.",
            icon: "success",
            confirmButtonColor: "#198754",
            customClass: {
              popup: "rounded-12",
              confirmButton: "rounded-8",
            },
          })

          this.categoriaMigrada.emit()
          this.cerrarModal()
        },
        error: (error) => {
          console.error("Error al migrar categoría:", error)
          
          Swal.fire({
            title: "Error",
            text: "No se pudo migrar la categoría. Inténtalo de nuevo.",
            icon: "error",
            confirmButtonColor: "#dc3545",
            customClass: {
              popup: "rounded-12",
              confirmButton: "rounded-8",
            },
          })
          
          this.isLoading = false
        },
      })
    } else {
      this.markFormGroupTouched()
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.migrarForm.controls).forEach((key) => {
      const control = this.migrarForm.get(key)
      control?.markAsTouched()
    })
  }

  private cerrarModal(): void {
    this.isLoading = false
    const modal = document.getElementById("modalMigrarCategoria")
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal)
      if (bootstrapModal) {
        bootstrapModal.hide()
      }
    }
    this.modalCerrado.emit()
  }
}