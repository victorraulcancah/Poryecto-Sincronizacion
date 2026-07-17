// src/pages/dashboard/empresa-info/empresa-info.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { EmpresaInfoService } from '../../../services/empresa-info.service';
import { PermissionsService } from '../../../services/permissions.service';
import { EmpresaInfo, EmpresaInfoCreate } from '../../../types/empresa-info.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-empresa-info',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Información de la Empresa</h5>
        <p class="text-gray-500 mb-0">Gestiona la información básica de tu empresa</p>
      </div>
    </div>

    <!-- Loading state -->
    <div *ngIf="isLoading" class="text-center py-40">
      <div class="spinner-border text-main-600" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-gray-500 mt-12 mb-0">Cargando información...</p>
    </div>

    <!-- Formulario -->
    <div *ngIf="!isLoading" class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-24">
        <form [formGroup]="empresaForm" (ngSubmit)="onSubmit()">
          <div class="row">
            <!-- Información básica -->
            <div class="col-md-8">
              <div class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Nombre de la Empresa *</label
                  >
                  <input
                    type="text"
                    class="form-control px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      empresaForm.get('nombre_empresa')?.invalid &&
                      empresaForm.get('nombre_empresa')?.touched
                    "
                    formControlName="nombre_empresa"
                    placeholder="Ej: MAGUS TEC S.A.C."
                  />
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      empresaForm.get('nombre_empresa')?.invalid &&
                      empresaForm.get('nombre_empresa')?.touched
                    "
                  >
                    El nombre de la empresa es requerido
                  </div>
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >RUC *</label
                  >
                  <input
                    type="text"
                    class="form-control px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      empresaForm.get('ruc')?.invalid &&
                      empresaForm.get('ruc')?.touched
                    "
                    formControlName="ruc"
                    placeholder="20123456789"
                    maxlength="11"
                  />
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      empresaForm.get('ruc')?.invalid &&
                      empresaForm.get('ruc')?.touched
                    "
                  >
                    El RUC debe tener 11 dígitos
                  </div>
                </div>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Razón Social *</label
                >
                <input
                  type="text"
                  class="form-control px-16 py-12 border rounded-8"
                  [class.is-invalid]="
                    empresaForm.get('razon_social')?.invalid &&
                    empresaForm.get('razon_social')?.touched
                  "
                  formControlName="razon_social"
                  placeholder="MAGUS TECNOLOGIA SOCIEDAD ANONIMA CERRADA"
                />
                <div
                  class="invalid-feedback"
                  *ngIf="
                    empresaForm.get('razon_social')?.invalid &&
                    empresaForm.get('razon_social')?.touched
                  "
                >
                  La razón social es requerida
                </div>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Dirección *</label
                >
                <textarea
                  class="form-control px-16 py-12 border rounded-8"
                  rows="3"
                  [class.is-invalid]="
                    empresaForm.get('direccion')?.invalid &&
                    empresaForm.get('direccion')?.touched
                  "
                  formControlName="direccion"
                  placeholder="Av. Principal 123, Distrito, Provincia, Departamento"
                ></textarea>
                <div
                  class="invalid-feedback"
                  *ngIf="
                    empresaForm.get('direccion')?.invalid &&
                    empresaForm.get('direccion')?.touched
                  "
                >
                  La dirección es requerida
                </div>
              </div>

              <!-- Contacto -->
              <div class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Teléfono</label
                  >
                  <input
                    type="tel"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="telefono"
                    placeholder="(01) 234-5678"
                  />
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Celular</label
                  >
                  <input
                    type="tel"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="celular"
                    placeholder="987 654 321"
                  />
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Email</label
                  >
                  <input
                    type="email"
                    class="form-control px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      empresaForm.get('email')?.invalid &&
                      empresaForm.get('email')?.touched
                    "
                    formControlName="email"
                    placeholder="contacto@magustec.com"
                  />
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      empresaForm.get('email')?.invalid &&
                      empresaForm.get('email')?.touched
                    "
                  >
                    Ingresa un email válido
                  </div>
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Sitio Web</label
                  >
                  <input
                    type="url"
                    class="form-control px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      empresaForm.get('website')?.invalid &&
                      empresaForm.get('website')?.touched
                    "
                    formControlName="website"
                    placeholder="https://www.magustec.com"
                  />
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      empresaForm.get('website')?.invalid &&
                      empresaForm.get('website')?.touched
                    "
                  >
                    Ingresa una URL válida
                  </div>
                </div>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Descripción</label
                >
                <textarea
                  class="form-control px-16 py-12 border rounded-8"
                  rows="3"
                  formControlName="descripcion"
                  placeholder="Descripción de la empresa..."
                ></textarea>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Sobre Nosotros</label
                >
                <textarea
                  class="form-control px-16 py-12 border rounded-8"
                  rows="5"
                  formControlName="sobre_nosotros"
                  placeholder="Cuenta la historia, misión y valores de tu empresa. Este texto se muestra en la página pública 'Sobre Nosotros' de la tienda."
                ></textarea>
              </div>

              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Horario de Atención</label
                >
                <textarea
                  class="form-control px-16 py-12 border rounded-8"
                  rows="2"
                  formControlName="horario_atencion"
                  placeholder="Lunes a Viernes: 8:00 AM - 6:00 PM&#10;Sábados: 8:00 AM - 1:00 PM"
                ></textarea>
              </div>

              <!-- Redes Sociales -->
              <h6 class="text-heading fw-semibold mb-16">Redes Sociales</h6>
              <div class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    ><i class="ph ph-facebook-logo me-8 text-primary"></i>Facebook</label
                  >
                  <input
                    type="url"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="facebook"
                    placeholder="https://facebook.com/magustec"
                  />
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    ><i class="ph ph-instagram-logo me-8 text-danger"></i>Instagram</label
                  >
                  <input
                    type="url"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="instagram"
                    placeholder="https://instagram.com/magustec"
                  />
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    ><i class="ph ph-twitter-logo me-8 text-info"></i>Twitter</label
                  >
                  <input
                    type="url"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="twitter"
                    placeholder="https://twitter.com/magustec"
                  />
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    ><i class="ph ph-youtube-logo me-8 text-danger"></i>YouTube</label
                  >
                  <input
                    type="url"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="youtube"
                    placeholder="https://youtube.com/@magustec"
                  />
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    ><i class="ph ph-tiktok-logo me-8 text-dark"></i>TikTok</label
                  >
                  <input
                    type="url"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="tiktok"
                    placeholder="https://tiktok.com/@magustec"
                  />
                </div>

                <div class="col-md-6 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    ><i class="ph ph-whatsapp-logo me-8 text-success"></i>WhatsApp</label
                  >
                  <input
                    type="tel"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="whatsapp"
                    placeholder="987654321"
                  />
                </div>
              </div>

              <!-- Métodos de pago (footer de la tienda) -->
              <h6 class="text-heading fw-semibold mb-16">
                Métodos de Pago (footer de la tienda)
              </h6>
              <p class="text-gray-500 text-sm mb-16">
                Marca los métodos de pago que quieres mostrar en el footer de la tienda.
              </p>
              <div class="d-flex flex-wrap gap-16 mb-16">
                <label
                  *ngFor="let metodo of metodosPagoDisponibles"
                  class="d-flex align-items-center gap-8 border rounded-8 px-16 py-10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    class="form-check-input m-0"
                    [formControlName]="'pago_' + metodo.key"
                  />
                  <img
                    [src]="metodo.image"
                    [alt]="metodo.label"
                    style="height: 24px; width: auto; object-fit: contain;"
                  />
                  <span class="text-sm">{{ metodo.label }}</span>
                </label>
              </div>
            </div>

            <!-- Logo -->
            <div class="col-md-4">
              <label class="form-label text-heading fw-medium mb-8"
                >Logo de la Empresa</label
              >
              <div
                class="upload-area border-2 border-dashed border-gray-200 rounded-8 p-16 text-center"
                [class.border-main-600]="logoPreview"
              >
                <div *ngIf="!logoPreview" class="text-center">
                  <i class="ph ph-image text-gray-400 text-4xl mb-12"></i>
                  <p class="text-gray-500 text-sm mb-12">
                    Seleccionar logo
                  </p>
                  <label
                    class="btn bg-main-50 text-main-600 px-12 py-6 rounded-6 cursor-pointer text-sm"
                  >
                    <i class="ph ph-upload me-6"></i>
                    Subir logo
                    <input
                      type="file"
                      class="d-none"
                      accept="image/*"
                      (change)="onLogoSelected($event)"
                    />
                  </label>
                </div>

                <div *ngIf="logoPreview" class="text-center">
                  <img
                    [src]="logoPreview"
                    alt="Logo Preview"
                    class="img-fluid rounded-6 mb-12"
                    style="max-height: 150px;"
                  />
                  <br />
                  <label
                    class="btn bg-main-50 text-main-600 px-12 py-6 rounded-6 cursor-pointer text-sm"
                  >
                    <i class="ph ph-pencil me-6"></i>
                    Cambiar logo
                    <input
                      type="file"
                      class="d-none"
                      accept="image/*"
                      (change)="onLogoSelected($event)"
                    />
                  </label>
                </div>
              </div>
              <small class="text-gray-500 text-xs mt-8 d-block">
                Formatos: JPG, PNG, GIF (máx. 2MB)
              </small>

              <!-- Color del navbar -->
              <div class="mt-24">
                <label class="form-label text-heading fw-medium mb-8"
                  >Color del navbar (tienda)</label
                >
                <div class="d-flex align-items-center gap-12">
                  <input
                    type="color"
                    class="form-control form-control-color border rounded-8"
                    style="width: 56px; height: 42px; padding: 4px;"
                    formControlName="color_navbar"
                  />
                  <input
                    type="text"
                    class="form-control px-16 py-12 border rounded-8"
                    formControlName="color_navbar"
                    placeholder="#9B1C1C"
                    maxlength="7"
                  />
                </div>
                <div
                  class="rounded-8 mt-12 px-16 py-10 text-white text-sm fw-medium"
                  [style.background-color]="empresaForm.get('color_navbar')?.value || '#9B1C1C'"
                >
                  Vista previa del navbar
                </div>
                <button
                  type="button"
                  class="btn btn-link text-main-600 text-sm px-0 mt-8"
                  (click)="restaurarColorNavbar()"
                >
                  Restaurar color original
                </button>
              </div>
            </div>
          </div>

          <!-- Botones -->
          <div class="d-flex justify-content-end gap-12 mt-24 pt-24 border-top">
            <button
              type="button"
              class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
              (click)="resetForm()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              [disabled]="isSubmitting || !permissionsService.canEditEmpresaInfo()"
            >
              <span
                *ngIf="isSubmitting"
                class="spinner-border spinner-border-sm me-8"
              ></span>
              <i *ngIf="!isSubmitting" class="ph ph-check me-8"></i>
              {{
                isSubmitting ? 'Guardando...' : empresaInfo ? 'Actualizar' : 'Guardar'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Estado sin información -->
    <div
      *ngIf="!isLoading && !empresaInfo && !hasError"
      class="card border-0 shadow-sm rounded-12"
    >
      <div class="card-body text-center py-40">
        <i class="ph ph-building text-gray-300 text-6xl mb-16"></i>
        <h6 class="text-heading fw-semibold mb-8">No hay información de empresa</h6>
        <p class="text-gray-500 mb-16">Completa la información básica de tu empresa</p>
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
export class EmpresaInfoComponent implements OnInit {
  // Color por defecto del navbar (equivale al main-600 actual del tema)
  readonly COLOR_NAVBAR_DEFAULT = '#9B1C1C';

  // Métodos de pago que se pueden mostrar/ocultar en el footer de la tienda
  readonly metodosPagoDisponibles = [
    { key: 'visa', label: 'Visa', image: '/assets/images/payment/visa.png' },
    { key: 'mastercard', label: 'Mastercard', image: '/assets/images/payment/mastercard.png' },
    { key: 'amex', label: 'American Express', image: '/assets/images/payment/amex.png' },
    { key: 'yape', label: 'Yape', image: '/assets/images/payment/yape.png' },
    { key: 'plin', label: 'Plin', image: '/assets/images/payment/plin.png' },
  ];

  empresaForm: FormGroup;
  empresaInfo: EmpresaInfo | null = null;
  selectedLogo: File | null = null;
  logoPreview: string | null = null;
  isLoading = true;
  isSubmitting = false;
  hasError = false;

  constructor(
    private fb: FormBuilder,
    private empresaInfoService: EmpresaInfoService,
    public permissionsService: PermissionsService
  ) {
    this.empresaForm = this.fb.group({
      nombre_empresa: ['', [Validators.required]],
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      razon_social: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      telefono: [''],
      celular: [''],
      email: ['', [Validators.email]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      descripcion: [''],
      sobre_nosotros: [''],
      facebook: [''],
      instagram: [''],
      twitter: [''],
      youtube: [''],
      tiktok: [''],
      whatsapp: [''],
      horario_atencion: [''],
      color_navbar: [this.COLOR_NAVBAR_DEFAULT, [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      ...Object.fromEntries(
        this.metodosPagoDisponibles.map((m) => ['pago_' + m.key, [true]])
      ),
    });
  }

  ngOnInit(): void {
    this.cargarEmpresaInfo();
  }

  cargarEmpresaInfo(): void {
    this.isLoading = true;
    this.hasError = false;

    this.empresaInfoService.obtenerEmpresaInfo().subscribe({
      next: (empresaInfo) => {
        this.empresaInfo = empresaInfo;
        this.empresaForm.patchValue({
          nombre_empresa: empresaInfo.nombre_empresa,
          ruc: empresaInfo.ruc,
          razon_social: empresaInfo.razon_social,
          direccion: empresaInfo.direccion,
          telefono: empresaInfo.telefono || '',
          celular: empresaInfo.celular || '',
          email: empresaInfo.email || '',
          website: empresaInfo.website || '',
          descripcion: empresaInfo.descripcion || '',
          sobre_nosotros: empresaInfo.sobre_nosotros || '',
          facebook: empresaInfo.facebook || '',
          instagram: empresaInfo.instagram || '',
          twitter: empresaInfo.twitter || '',
          youtube: empresaInfo.youtube || '',
          tiktok: empresaInfo.tiktok || '',
          whatsapp: empresaInfo.whatsapp || '',
          horario_atencion: empresaInfo.horario_atencion || '',
          color_navbar: empresaInfo.color_navbar || this.COLOR_NAVBAR_DEFAULT,
          ...Object.fromEntries(
            this.metodosPagoDisponibles.map((m) => [
              'pago_' + m.key,
              // Si nunca se guardó nada (undefined), por defecto se muestran todos
              empresaInfo.metodos_pago
                ? empresaInfo.metodos_pago.includes(m.key)
                : true,
            ])
          ),
        });
        this.logoPreview = empresaInfo.logo_url || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar información de empresa:', error);
        if (error.status === 404) {
          // No existe información de empresa, mostrar formulario vacío
          this.empresaInfo = null;
        } else {
          this.hasError = true;
        }
        this.isLoading = false;
      },
    });
  }

  restaurarColorNavbar(): void {
    this.empresaForm.get('color_navbar')?.setValue(this.COLOR_NAVBAR_DEFAULT);
  }

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedLogo = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.empresaForm.valid && this.permissionsService.canEditEmpresaInfo()) {
      this.isSubmitting = true;

      const { ...rawValue } = this.empresaForm.value;
      this.metodosPagoDisponibles.forEach((m) => delete rawValue['pago_' + m.key]);

      const metodosPago = this.metodosPagoDisponibles
        .filter((m) => this.empresaForm.get('pago_' + m.key)?.value)
        .map((m) => m.key);

      const formValue: EmpresaInfoCreate = {
        ...rawValue,
        metodos_pago: metodosPago,
        logo: this.selectedLogo,
      };

      const request = this.empresaInfo
        ? this.empresaInfoService.actualizarEmpresaInfo(this.empresaInfo.id, formValue)
        : this.empresaInfoService.crearEmpresaInfo(formValue);

      request.subscribe({
        next: (response) => {
          console.log('Información de empresa guardada exitosamente:', response);
          Swal.fire({
            title: '¡Éxito!',
            text: this.empresaInfo
              ? 'Información de empresa actualizada exitosamente.'
              : 'Información de empresa creada exitosamente.',
            icon: 'success',
            confirmButtonColor: '#198754',
            customClass: {
              popup: 'rounded-12',
              confirmButton: 'rounded-8',
            },
          });
          this.cargarEmpresaInfo();
          this.empresaInfoService.refreshPublicInfo();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error al guardar información de empresa:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar la información. Inténtalo de nuevo.',
            icon: 'error',
            confirmButtonColor: '#dc3545',
            customClass: {
              popup: 'rounded-12',
              confirmButton: 'rounded-8',
            },
          });
          this.isSubmitting = false;
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  resetForm(): void {
    if (this.empresaInfo) {
      this.cargarEmpresaInfo();
    } else {
      this.empresaForm.reset();
      this.logoPreview = null;
      this.selectedLogo = null;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.empresaForm.controls).forEach((key) => {
      const control = this.empresaForm.get(key);
      control?.markAsTouched();
    });
  }
}