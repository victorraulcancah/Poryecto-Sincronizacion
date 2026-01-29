// src/app/component/banner-modal/banner-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BannersService, Banner, BannerCreate } from '../../services/banner.service';

@Component({
  selector: 'app-banner-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalCrearBanner" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ banner ? 'Editar Banner' : 'Nuevo Banner' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <form [formGroup]="bannerForm" (ngSubmit)="onSubmit()">
              <div class="row">
                <!-- ✅ INFORMACIÓN SIMPLIFICADA - Solo lo esencial -->
                <div class="col-md-8">
                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">URL de Enlace *</label>
                    <input type="text"
                           class="form-control px-16 py-12 border rounded-8"
                           [class.is-invalid]="bannerForm.get('enlace_url')?.invalid && bannerForm.get('enlace_url')?.touched"
                           formControlName="enlace_url"
                           placeholder="/shop">
                    <div class="invalid-feedback"
                         *ngIf="bannerForm.get('enlace_url')?.invalid && bannerForm.get('enlace_url')?.touched">
                      La URL de enlace es requerida
                    </div>
                    <small class="text-gray-500 mt-4">
                      A dónde redirigir cuando el usuario haga clic en el banner
                    </small>
                  </div>

                  <div class="row">
                    <div class="col-md-6 mb-16">
                      <label class="form-label text-heading fw-medium mb-8">Orden *</label>
                      <input type="number"
                             class="form-control px-16 py-12 border rounded-8"
                             [class.is-invalid]="bannerForm.get('orden')?.invalid && bannerForm.get('orden')?.touched"
                             formControlName="orden"
                             min="1"
                             placeholder="1">
                      <div class="invalid-feedback"
                           *ngIf="bannerForm.get('orden')?.invalid && bannerForm.get('orden')?.touched">
                        El orden es requerido
                      </div>
                      <small class="text-gray-500 mt-4">
                        Orden de aparición en el carrusel
                      </small>
                    </div>

                    <div class="col-md-6 mb-16">
                      <div class="form-check mt-32">
                        <input class="form-check-input"
                               type="checkbox"
                               formControlName="activo"
                               id="activo">
                        <label class="form-check-label text-heading fw-medium" for="activo">
                          Banner activo
                        </label>
                        <small class="text-gray-500 d-block mt-4">
                          Solo se mostrarán banners activos
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ✅ IMAGEN DEL BANNER - Principal y único -->
                <div class="col-md-4">
                  <label class="form-label text-heading fw-medium mb-8">
                    <i class="ph ph-image me-8"></i>
                    Imagen del Banner *
                  </label>
                  <div class="upload-area border-2 border-dashed border-gray-200 rounded-8 p-16 text-center"
                       [class.border-main-600]="imagePreview"
                       [class.border-danger]="!imagePreview && bannerForm.touched">

                    <div *ngIf="!imagePreview" class="text-center">
                      <i class="ph ph-image text-gray-400 text-4xl mb-12"></i>
                      <p class="text-gray-600 text-sm mb-8 fw-medium">Banner estilo Mercado Libre</p>
                      <p class="text-gray-500 text-xs mb-12">Solo imagen, sin texto sobrepuesto</p>
                      <label class="btn bg-main-600 text-white px-16 py-8 rounded-8 cursor-pointer">
                        <i class="ph ph-upload me-6"></i>
                        Subir Banner
                        <input type="file"
                               class="d-none"
                               accept="image/*"
                               (change)="onImageSelected($event)">
                      </label>
                    </div>

                    <div *ngIf="imagePreview" class="text-center">
                      <img [src]="imagePreview"
                           alt="Preview del banner"
                           class="img-fluid rounded-8 mb-12"
                           style="max-height: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      <br>
                      <label class="btn bg-main-50 text-main-600 px-12 py-6 rounded-6 cursor-pointer text-sm">
                        <i class="ph ph-pencil me-6"></i>
                        Cambiar imagen
                        <input type="file"
                               class="d-none"
                               accept="image/*"
                               (change)="onImageSelected($event)">
                      </label>
                    </div>
                  </div>
                  <div class="mt-8">
                    <small class="text-gray-600 text-xs d-block fw-medium">
                      <strong>Formatos:</strong> JPG, PNG, GIF (máx. 2MB)
                    </small>
                    <small class="text-info text-xs d-block mt-4">
                      <i class="ph ph-lightbulb me-4"></i>
                      <strong>Recomendado:</strong> 1200x400px para mejor calidad
                    </small>
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
              {{ isLoading ? 'Guardando...' : (banner ? 'Actualizar' : 'Guardar') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upload-area {
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .upload-area:hover {
      border-color: var(--bs-main-600) !important;
    }
  `]
})
export class BannerModalComponent implements OnInit, OnChanges {
  
  @Input() banner: Banner | null = null;
  @Output() bannerGuardado = new EventEmitter<void>();
  @Output() modalCerrado = new EventEmitter<void>();

  bannerForm: FormGroup;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private bannersService: BannersService
  ) {
    // ✅ FORMULARIO SIMPLIFICADO - Solo campos esenciales
    this.bannerForm = this.fb.group({
      enlace_url: ['/shop', [Validators.required]],
      orden: [1, [Validators.required, Validators.min(1)]],
      activo: [true]
    });
  }

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.banner) {
      // ✅ MODO EDICIÓN - Solo campos esenciales
      this.bannerForm.patchValue({
        enlace_url: this.banner.enlace_url,
        orden: this.banner.orden,
        activo: this.banner.activo
      });
      this.imagePreview = this.banner.imagen_url || null;
    } else {
      // ✅ MODO CREACIÓN - Valores por defecto
      this.bannerForm.reset({
        enlace_url: '/shop',
        orden: 1,
        activo: true
      });
      this.imagePreview = null;
      this.selectedImage = null;
    }
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    // ✅ VALIDACIÓN PERSONALIZADA: Imagen requerida
    if (this.bannerForm.valid && (this.selectedImage || this.imagePreview)) {
      this.isLoading = true;

      // ✅ DATOS DEL BANNER con campos predeterminados
      const bannerData: BannerCreate = {
        titulo: 'Banner ' + new Date().getTime(), // Título automático
        subtitulo: '', // Vacío
        descripcion: '', // Vacío
        texto_boton: 'Ver más', // Predeterminado (no se usa)
        precio_desde: undefined, // Sin precio
        enlace_url: this.bannerForm.value.enlace_url,
        orden: this.bannerForm.value.orden,
        activo: this.bannerForm.value.activo,
        imagen: this.selectedImage || undefined // ✅ Convierte null a undefined
      };

      const request = this.banner
        ? this.bannersService.actualizarBanner(this.banner.id, bannerData)
        : this.bannersService.crearBanner(bannerData);

      request.subscribe({
        next: (response) => {
          console.log('Banner guardado exitosamente:', response);
          this.bannerGuardado.emit();
          this.cerrarModal();
        },
        error: (error) => {
          console.error('Error al guardar banner:', error);
          this.isLoading = false;
        }
      });
    } else {
      // ✅ VALIDACIÓN MEJORADA
      if (!this.selectedImage && !this.imagePreview) {
        alert('Por favor selecciona una imagen para el banner');
      }
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.bannerForm.controls).forEach(key => {
      const control = this.bannerForm.get(key);
      control?.markAsTouched();
    });
  }

  private cerrarModal(): void {
    this.isLoading = false;
    const modal = document.getElementById('modalCrearBanner');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
    this.modalCerrado.emit();
  }
}