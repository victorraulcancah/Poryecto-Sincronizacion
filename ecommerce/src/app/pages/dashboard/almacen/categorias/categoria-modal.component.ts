// src\app\pages\dashboard\almacen\categorias\categoria-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { AlmacenService } from "../../../../services/almacen.service"
import { Categoria, Seccion} from "../../../../types/almacen.types"

@Component({
  selector: "app-categoria-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalCrearCategoria" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ categoria ? 'Editar Categoría' : 'Nueva Categoría' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <form [formGroup]="categoriaForm" (ngSubmit)="onSubmit()">
              <div class="row">
                <!-- Información básica -->
                <div class="col-md-8">
                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Nombre de la Categoría *</label>
                    <input type="text" 
                           class="form-control px-16 py-12 border rounded-8"
                           [class.is-invalid]="categoriaForm.get('nombre')?.invalid && categoriaForm.get('nombre')?.touched"
                           formControlName="nombre"
                           placeholder="Ej: Electrónicos">
                    <div class="invalid-feedback" 
                         *ngIf="categoriaForm.get('nombre')?.invalid && categoriaForm.get('nombre')?.touched">
                      El nombre es requerido (mínimo 3 caracteres)
                    </div>
                  </div>

                  <!-- Agregar este bloque después del div del campo "nombre" y antes del campo "descripcion" -->
                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Sección *</label>
                    <select class="form-select px-16 py-12 border rounded-8"
                            [class.is-invalid]="categoriaForm.get('id_seccion')?.invalid && categoriaForm.get('id_seccion')?.touched"
                            formControlName="id_seccion">
                      <option value="">Seleccionar sección</option>
                      <option *ngFor="let seccion of secciones" [value]="seccion.id">
                        {{ seccion.nombre }}
                      </option>
                    </select>
                    <div class="invalid-feedback" 
                        *ngIf="categoriaForm.get('id_seccion')?.invalid && categoriaForm.get('id_seccion')?.touched">
                      Selecciona una sección
                    </div>
                  </div>

                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Descripción</label>
                    <textarea class="form-control px-16 py-12 border rounded-8" 
                              rows="3"
                              formControlName="descripcion"
                              placeholder="Descripción de la categoría..."></textarea>
                  </div>

                  <div class="form-check">
                    <input class="form-check-input" 
                           type="checkbox" 
                           formControlName="activo"
                           id="activo">
                    <label class="form-check-label text-heading fw-medium" for="activo">
                      Categoría activa
                    </label>
                  </div>
                </div>

                <!-- Imagen -->
                <div class="col-md-4">
                  <label class="form-label text-heading fw-medium mb-8">Imagen</label>
                  <div class="upload-area border-2 border-dashed border-gray-200 rounded-8 p-16 text-center"
                       [class.border-main-600]="imagePreview">
                    
                   <div *ngIf="!imagePreview" class="text-center">
                      <i class="ph ph-image text-gray-400 text-3xl mb-8"></i>
                      <p class="text-gray-500 text-sm mb-8">Seleccionar imagen</p>
                      <label class="btn bg-main-50 text-main-600 px-12 py-6 rounded-6 cursor-pointer text-sm">
                        <i class="ph ph-upload me-6"></i>
                        Subir
                        <input type="file" 
                               class="d-none" 
                               accept="image/*"
                               (change)="onImageSelected($event)">
                      </label>
                    </div>

                    <div *ngIf="imagePreview" class="text-center">
                      <img [src]="imagePreview" 
                           alt="Preview" 
                           class="img-fluid rounded-6 mb-8"
                           style="max-height: 120px;">
                      <br>
                      <label class="btn bg-main-50 text-main-600 px-12 py-6 rounded-6 cursor-pointer text-sm">
                        <i class="ph ph-pencil me-6"></i>
                        Cambiar
                        <input type="file" 
                               class="d-none" 
                               accept="image/*"
                               (change)="onImageSelected($event)">
                      </label>
                    </div>
                  </div>
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
                    class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                    [disabled]="isLoading"
                    (click)="onSubmit()">
              <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-8"></span>
              <i *ngIf="!isLoading" class="ph ph-check me-8"></i>
              {{ isLoading ? 'Guardando...' : (categoria ? 'Actualizar' : 'Guardar') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .upload-area {
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .upload-area:hover {
      border-color: var(--bs-main-600) !important;
    }
  `,
  ],
})
export class CategoriaModalComponent implements OnInit, OnChanges {
  @Input() categoria: Categoria | null = null
  @Output() categoriaGuardada = new EventEmitter<void>()
  @Output() modalCerrado = new EventEmitter<void>()

  categoriaForm: FormGroup
  selectedImage: File | null = null
  imagePreview: string | null = null
  isLoading = false
  secciones: Seccion[] = []

  constructor(
    private fb: FormBuilder,
    private almacenService: AlmacenService,
  ) {
    this.categoriaForm = this.fb.group({
      nombre: ["", [Validators.required, Validators.minLength(3)]],
      id_seccion: ["", [Validators.required]],
      descripcion: [""],
      activo: [true],
    })
  }

  ngOnInit(): void {
    this.cargarSecciones()
  }

  // ← NUEVO MÉTODO
  cargarSecciones(): void {
    this.almacenService.obtenerSecciones().subscribe({
      next: (secciones) => {
        this.secciones = secciones
      },
      error: (error) => {
        console.error("Error al cargar secciones:", error)
      },
    })
  }

  ngOnChanges(): void {
    if (this.categoria) {
      this.categoriaForm.patchValue({
        nombre: this.categoria.nombre,
        id_seccion: this.categoria.id_seccion,
        descripcion: this.categoria.descripcion,
        activo: this.categoria.activo,
      })
      this.imagePreview = this.categoria.imagen_url || null
    } else {
      this.categoriaForm.reset({
        nombre: "",
        id_seccion: "",
        descripcion: "",
        activo: true,
      })
      this.imagePreview = null
      this.selectedImage = null
    }
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0]
    if (file) {
      this.selectedImage = file

      const reader = new FileReader()
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  onSubmit(): void {
    if (this.categoriaForm.valid) {
      this.isLoading = true

      const formValue = {
        ...this.categoriaForm.value,
        activo: Boolean(this.categoriaForm.get('activo')?.value),
        imagen: this.selectedImage,
      }

      const request = this.categoria
        ? this.almacenService.actualizarCategoria(this.categoria.id, formValue)
        : this.almacenService.crearCategoria(formValue)

      request.subscribe({
        next: (response) => {
          console.log("Categoría guardada exitosamente:", response)
          this.categoriaGuardada.emit()
          this.cerrarModal()
        },
        error: (error) => {
          console.error("Error al guardar categoría:", error)
          this.isLoading = false
        },
      })
    } else {
      this.markFormGroupTouched()
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.categoriaForm.controls).forEach((key) => {
      const control = this.categoriaForm.get(key)
      control?.markAsTouched()
    })
  }

  private cerrarModal(): void {
    this.isLoading = false
    const modal = document.getElementById("modalCrearCategoria")
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal)
      if (bootstrapModal) {
        bootstrapModal.hide()
      }
    }
    this.modalCerrado.emit()
  }
}