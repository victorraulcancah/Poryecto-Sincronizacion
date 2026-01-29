import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BannerFlashSalesService, BannerFlashSale } from '../../../../services/banner-flash-sales.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-banner-flash-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal fade" id="modalCrearBannerFlash" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-xl">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ banner?.id ? 'Editar' : 'Nuevo' }} Banner Flash Sale
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" (click)="cerrarModal()"></button>
          </div>

          <div class="modal-body p-24">
            <form #bannerForm="ngForm">
              <div class="row">
                <!-- Columna Izquierda: Formulario -->
                <div class="col-md-8">
                  <h6 class="text-heading fw-semibold mb-16">Información Básica</h6>

                  <!-- Nombre del Banner (con diseño de badge) -->
                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-12">Nombre del Banner *</label>
                    <div class="position-relative">
                      <input type="text"
                             class="form-control px-16 py-12 border rounded-8"
                             [(ngModel)]="formData.nombre"
                             name="nombre"
                             placeholder="Ej: Flash Sale del Día - 50% OFF"
                             required>
                    </div>
                  </div>

                  <!-- Color del Badge -->
                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Color del Badge</label>
                    <div class="d-flex align-items-center gap-12">
                      <input type="color"
                             class="form-control form-control-color"
                             [(ngModel)]="formData.color_badge"
                             name="color_badge"
                             style="width: 60px; height: 40px;">
                      <input type="text"
                             class="form-control px-16 py-12 border rounded-8"
                             [(ngModel)]="formData.color_badge"
                             name="color_badge_text"
                             placeholder="#DC2626">
                    </div>
                    <!-- Preview del badge -->
                    <div *ngIf="formData.nombre" class="mt-12">
                      <small class="text-muted d-block mb-8">Vista previa del badge:</small>
                      <span class="badge text-white px-16 py-8 rounded-pill"
                            [style.background-color]="formData.color_badge || '#DC2626'"
                            style="font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        <i class="ph ph-lightning me-6"></i>
                        {{ formData.nombre }}
                      </span>
                    </div>
                    <small class="text-muted mt-8 d-block">
                      <i class="ph ph-info me-4"></i>
                      Este badge aparecerá destacado sobre la imagen del banner
                    </small>
                  </div>

                  <hr class="my-20">

                  <h6 class="text-heading fw-semibold mb-16">Vigencia</h6>

                  <div class="row">
                    <div class="col-md-6 mb-16">
                      <label class="form-label text-heading fw-medium mb-8">Fecha inicio *</label>
                      <input type="datetime-local"
                             class="form-control px-16 py-12 border rounded-8"
                             [(ngModel)]="formData.fecha_inicio"
                             name="fecha_inicio"
                             required>
                    </div>

                    <div class="col-md-6 mb-16">
                      <label class="form-label text-heading fw-medium mb-8">Fecha fin *</label>
                      <input type="datetime-local"
                             class="form-control px-16 py-12 border rounded-8"
                             [(ngModel)]="formData.fecha_fin"
                             name="fecha_fin"
                             required>
                    </div>
                  </div>

                  <hr class="my-20">

                  <h6 class="text-heading fw-semibold mb-16">Diseño del Botón</h6>

                  <div class="row">
                    <div class="col-md-6 mb-16">
                      <label class="form-label text-heading fw-medium mb-8">Color del botón</label>
                      <div class="d-flex align-items-center gap-12">
                        <input type="color"
                               class="form-control form-control-color"
                               [(ngModel)]="formData.color_boton"
                               name="color_boton"
                               style="width: 60px; height: 40px;">
                        <input type="text"
                               class="form-control px-16 py-12 border rounded-8"
                               [(ngModel)]="formData.color_boton"
                               name="color_boton_text"
                               placeholder="#3B82F6">
                      </div>
                    </div>

                    <div class="col-md-6 mb-16">
                      <label class="form-label text-heading fw-medium mb-8">Texto del botón</label>
                      <input type="text"
                             class="form-control px-16 py-12 border rounded-8"
                             [(ngModel)]="formData.texto_boton"
                             name="texto_boton"
                             placeholder="Compra ahora">
                    </div>
                  </div>

                  <div class="mb-16">
                    <label class="form-label text-heading fw-medium mb-8">Enlace URL</label>
                    <input type="text"
                           class="form-control px-16 py-12 border rounded-8"
                           [(ngModel)]="formData.enlace_url"
                           name="enlace_url"
                           placeholder="/shop">
                  </div>

                  <div class="form-check form-switch">
                    <input class="form-check-input"
                           type="checkbox"
                           [(ngModel)]="formData.activo"
                           name="activo"
                           id="activo">
                    <label class="form-check-label text-heading fw-medium" for="activo">
                      Banner activo
                    </label>
                  </div>
                </div>

                <!-- Columna Derecha: Imagen -->
                <div class="col-md-4">
                  <h6 class="text-heading fw-semibold mb-16">Imagen del Banner</h6>

                  <!-- Recomendaciones de imagen -->
                  <small class="text-info text-xs d-block mb-8">
                    <i class="ph ph-lightbulb me-4"></i>
                    <strong>Tamaño recomendado:</strong> 1400x500px (panorámico) para mejor visualización
                  </small>
                  <small class="text-warning text-xs d-block mb-12">
                    ⚠️ Imágenes muy cuadradas o verticales pueden verse deformadas en el banner
                  </small>

                  <div class="upload-area border-2 border-dashed border-gray-200 rounded-8 p-16 text-center"
                       [class.border-main-600]="imagenPreview">

                    <div *ngIf="!imagenPreview" class="text-center">
                      <i class="ph ph-image text-gray-400 text-4xl mb-12"></i>
                      <p class="text-gray-500 text-sm mb-12">Seleccionar imagen</p>
                      <small class="text-muted d-block mb-12">JPG, PNG, GIF, WEBP (Máx. 2MB)</small>
                      <label class="btn bg-main-600 text-white px-16 py-8 rounded-8 cursor-pointer">
                        <i class="ph ph-upload me-6"></i>
                        Subir imagen
                        <input type="file"
                               class="d-none"
                               accept="image/*"
                               (change)="onImageSelected($event)">
                      </label>
                    </div>

                    <div *ngIf="imagenPreview" class="text-center">
                      <img [src]="imagenPreview"
                           alt="Preview"
                           class="img-fluid rounded-6 mb-12"
                           style="max-height: 200px;"
                           (error)="onImageError()">
                      <br>
                      <label class="btn bg-main-600 text-white px-16 py-8 rounded-8 cursor-pointer">
                        <i class="ph ph-pencil me-6"></i>
                        Cambiar imagen
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
                    data-bs-dismiss="modal"
                    (click)="cerrarModal()">
              Cancelar
            </button>
            <button type="button"
                    class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                    [disabled]="isLoading || !bannerForm.valid"
                    (click)="guardarBanner()">
              <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-8"></span>
              <i *ngIf="!isLoading" class="ph ph-check me-8"></i>
              {{ isLoading ? 'Guardando...' : (banner?.id ? 'Actualizar' : 'Crear') }} Banner
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

      &:hover {
        border-color: var(--main-600) !important;
        background-color: var(--main-50);
      }
    }

    .form-control:focus,
    .form-select:focus {
      border-color: var(--main-600);
      box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
    }
  `]
})
export class BannerFlashSaleModalComponent implements OnChanges {
  @Input() banner: BannerFlashSale | null = null;
  @Output() bannerGuardado = new EventEmitter<void>();
  @Output() modalCerrado = new EventEmitter<void>();

  formData: BannerFlashSale = this.getEmptyForm();
  isLoading = false;
  imagenPreview: string | null = null;

  constructor(
    private bannerFlashSalesService: BannerFlashSalesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    if (this.banner) {
      // Modo edición
      this.formData = { ...this.banner };
      this.formData.activo = this.banner.activo;
      this.imagenPreview = this.banner.imagen_url || null;

      // Convertir fechas para datetime-local
      if (this.formData.fecha_inicio) {
        this.formData.fecha_inicio = this.formatDateForInput(this.formData.fecha_inicio);
      }
      if (this.formData.fecha_fin) {
        this.formData.fecha_fin = this.formatDateForInput(this.formData.fecha_fin);
      }
    } else {
      // Modo creación
      this.formData = this.getEmptyForm();
      this.imagenPreview = null;
    }
  }

  getEmptyForm(): BannerFlashSale {
    return {
      nombre: '',
      color_badge: '#DC2626',
      fecha_inicio: '',
      fecha_fin: '',
      color_boton: '#DC2626',
      texto_boton: 'Compra ahora',
      enlace_url: '/shop',
      activo: true
    };
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño (máx. 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es muy grande. El tamaño máximo permitido es 2MB.');
        event.target.value = '';
        return;
      }

      // Guardar el archivo
      (this.formData as any)['imagen'] = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;

        // Verificar dimensiones
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          const ratio = width / height;

          if (ratio < 2) {
            console.warn(`Imagen poco horizontal (${width}x${height}px). Se recomienda una imagen más ancha (ej: 1200x400px).`);
          } else if (width < 800) {
            console.warn(`Imagen pequeña (${width}x${height}px). Se recomienda usar al menos 1200px de ancho.`);
          }
        };
        img.src = result;
        this.imagenPreview = result;
      };
      reader.readAsDataURL(file);
    }
  }

  onImageError(): void {
    console.error('Error al cargar imagen');
    this.imagenPreview = null;
  }

  guardarBanner(): void {
    this.isLoading = true;

    const datosParaEnviar = { ...this.formData };
    datosParaEnviar.activo = this.formData.activo;

    const operacion = this.banner?.id
      ? this.bannerFlashSalesService.update(this.banner.id, datosParaEnviar as any)
      : this.bannerFlashSalesService.create(datosParaEnviar as any);

    operacion.subscribe({
      next: () => {
        Swal.fire({
          title: '¡Éxito!',
          text: `Banner ${this.banner?.id ? 'actualizado' : 'creado'} correctamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        this.bannerGuardado.emit();
        this.cerrarModal();
        this.isLoading = false;
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el banner',
          icon: 'error'
        });
        console.error('Error al guardar banner:', error);
        this.isLoading = false;
      }
    });
  }

  cerrarModal(): void {
    const modal = document.getElementById('modalCrearBannerFlash');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
    this.modalCerrado.emit();
  }

  private formatDateForInput(dateString: string): string {
    // ✅ CORREGIDO: Mantener la hora local sin conversión UTC
    const date = new Date(dateString);

    // Obtener componentes en hora local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Formato: YYYY-MM-DDTHH:mm (datetime-local)
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
