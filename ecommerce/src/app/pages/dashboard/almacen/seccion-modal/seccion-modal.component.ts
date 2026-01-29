import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { AlmacenService  } from "../../../../services/almacen.service"
import { Seccion,SeccionCreate } from "../../../../types/almacen.types"


@Component({
  selector: 'app-seccion-modal',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalCrearSeccion" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ seccion ? 'Editar Sección' : 'Nueva Sección' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <form [formGroup]="seccionForm" (ngSubmit)="onSubmit()">
              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8">Nombre de la Sección *</label>
                <input type="text" 
                       class="form-control px-16 py-12 border rounded-8"
                       [class.is-invalid]="seccionForm.get('nombre')?.invalid && seccionForm.get('nombre')?.touched"
                       formControlName="nombre"
                       placeholder="Ej: Electrónicos">
                <div class="invalid-feedback" 
                     *ngIf="seccionForm.get('nombre')?.invalid && seccionForm.get('nombre')?.touched">
                  El nombre es requerido (mínimo 3 caracteres)
                </div>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8">Descripción</label>
                <textarea class="form-control px-16 py-12 border rounded-8" 
                          rows="3"
                          formControlName="descripcion"
                          placeholder="Descripción de la sección..."></textarea>
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
                    class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                    [disabled]="isLoading"
                    (click)="onSubmit()">
              <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-8"></span>
              <i *ngIf="!isLoading" class="ph ph-check me-8"></i>
              {{ isLoading ? 'Guardando...' : (seccion ? 'Actualizar' : 'Guardar') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SeccionModalComponent implements OnInit, OnChanges {
  @Input() seccion: Seccion | null = null
  @Output() seccionGuardada = new EventEmitter<void>()
  @Output() modalCerrado = new EventEmitter<void>()

  seccionForm: FormGroup
  isLoading = false

  constructor(
    private fb: FormBuilder,
    private almacenService: AlmacenService,
  ) {
    this.seccionForm = this.fb.group({
      nombre: ["", [Validators.required, Validators.minLength(3)]],
      descripcion: [""],
    })
  }

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.seccion) {
      this.seccionForm.patchValue({
        nombre: this.seccion.nombre,
        descripcion: this.seccion.descripcion,
      })
    } else {
      this.seccionForm.reset({
        nombre: "",
        descripcion: "",
      })
    }
  }

  onSubmit(): void {
    if (this.seccionForm.valid) {
      this.isLoading = true

      const formValue = this.seccionForm.value

      const request = this.seccion
        ? this.almacenService.actualizarSeccion(this.seccion.id, formValue)
        : this.almacenService.crearSeccion(formValue)

      request.subscribe({
        next: (response) => {
          console.log("Sección guardada exitosamente:", response)
          this.seccionGuardada.emit()
          this.cerrarModal()
        },
        error: (error) => {
          console.error("Error al guardar sección:", error)
          this.isLoading = false
        },
      })
    } else {
      this.markFormGroupTouched()
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.seccionForm.controls).forEach((key) => {
      const control = this.seccionForm.get(key)
      control?.markAsTouched()
    })
  }

  private cerrarModal(): void {
    this.isLoading = false
    const modal = document.getElementById("modalCrearSeccion")
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal)
      if (bootstrapModal) {
        bootstrapModal.hide()
      }
    }
    this.modalCerrado.emit()
  }
}
