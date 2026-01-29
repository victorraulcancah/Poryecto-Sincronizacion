// src\app\pages\dashboard\almacen\marcas\marca-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { AlmacenService } from "../../../../services/almacen.service"
import {  MarcaProducto } from "../../../../types/almacen.types"

@Component({
  selector: "app-marca-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalCrearMarca" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ marca ? 'Editar Marca' : 'Nueva Marca' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <form [formGroup]="marcaForm" (ngSubmit)="onSubmit()">
              <div class="row">
                <!-- Información básica -->
                <div class="col-md-8">
                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Nombre de la Marca *</label>
                    <input type="text" 
                           class="form-control px-16 py-12 border rounded-8"
                           [class.is-invalid]="marcaForm.get('nombre')?.invalid && marcaForm.get('nombre')?.touched"
                           formControlName="nombre"
                           placeholder="Ej: Samsung">
                    <div class="invalid-feedback" 
                         *ngIf="marcaForm.get('nombre')?.invalid && marcaForm.get('nombre')?.touched">
                      El nombre es requerido (mínimo 2 caracteres)
                    </div>
                  </div>

                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Descripción</label>
                    <textarea class="form-control px-16 py-12 border rounded-8" 
                              rows="3"
                              formControlName="descripcion"
                              placeholder="Descripción de la marca..."></textarea>
                  </div>

                  <div class="form-check">
                    <input class="form-check-input" 
                           type="checkbox" 
                           formControlName="activo"
                           id="activo">
                    <label class="form-check-label text-heading fw-medium" for="activo">
                      Marca activa
                    </label>
                  </div>
                </div>

                <!-- Imagen -->
                <div class="col-md-4">
                  <label class="form-label text-heading fw-medium mb-8">Logo de la Marca</label>
                  <div class="upload-area border-2 border-dashed border-gray-200 rounded-8 p-16 text-center"
                       [class.border-main-600]="imagePreview">
                    
                   <div *ngIf="!imagePreview" class="text-center">
                      <i class="ph ph-tag text-gray-400 text-3xl mb-8"></i>
                      <p class="text-gray-500 text-sm mb-8">Seleccionar logo</p>
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
              {{ isLoading ? 'Guardando...' : (marca ? 'Actualizar' : 'Guardar') }}
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
export class MarcaModalComponent implements OnInit, OnChanges {
  @Input() marca: MarcaProducto | null = null
  @Output() marcaGuardada = new EventEmitter<void>()
  @Output() modalCerrado = new EventEmitter<void>()

  marcaForm: FormGroup
  selectedImage: File | null = null
  imagePreview: string | null = null
  isLoading = false

  constructor(
    private fb: FormBuilder,
    private almacenService: AlmacenService,
  ) {
    this.marcaForm = this.fb.group({
      nombre: ["", [Validators.required, Validators.minLength(2)]],
      descripcion: [""],
      activo: [true],
    })
  }

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.marca) {
      this.marcaForm.patchValue({
        nombre: this.marca.nombre,
        descripcion: this.marca.descripcion,
        activo: this.marca.activo,
      })
      this.imagePreview = this.marca.imagen_url || null
    } else {
      this.marcaForm.reset({
        nombre: "",
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
    if (this.marcaForm.valid) {
      this.isLoading = true

      const formValue: any = {
        nombre: this.marcaForm.get('nombre')?.value,
        descripcion: this.marcaForm.get('descripcion')?.value || '',
        activo: Boolean(this.marcaForm.get('activo')?.value),
      }

      // Solo agregar imagen si hay una nueva seleccionada
      if (this.selectedImage) {
        formValue.imagen = this.selectedImage
      }

      console.log('📤 Enviando marca:', {
        nombre: formValue.nombre,
        descripcion: formValue.descripcion,
        activo: formValue.activo,
        tieneImagen: !!this.selectedImage,
        nombreImagen: this.selectedImage?.name
      })

      const request = this.marca
        ? this.almacenService.actualizarMarca(this.marca.id, formValue)
        : this.almacenService.crearMarca(formValue)

      request.subscribe({
        next: (response) => {
          console.log("✅ Marca guardada exitosamente:", response)
          
          // Emitir evento de guardado
          this.marcaGuardada.emit()
          
          // Cerrar modal después de un pequeño delay
          setTimeout(() => {
            this.cerrarModal()
          }, 300)
        },
        error: (error) => {
          console.error("❌ Error al guardar marca:", error)
          alert(`Error al guardar marca: ${error.error?.message || error.message || 'Error desconocido'}`)
          this.isLoading = false
        },
      })
    } else {
      this.markFormGroupTouched()
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.marcaForm.controls).forEach((key) => {
      const control = this.marcaForm.get(key)
      control?.markAsTouched()
    })
  }

  private cerrarModal(): void {
    this.isLoading = false
    const modal = document.getElementById("modalCrearMarca")
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal)
      if (bootstrapModal) {
        bootstrapModal.hide()
      }
    }
    this.modalCerrado.emit()
  }
}