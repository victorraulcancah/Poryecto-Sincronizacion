import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FacturacionService } from '../../../../services/facturacion.service';
import Swal from 'sweetalert2';

interface EmpresaData {
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  domicilio_fiscal: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  email: string;
  telefono: string;
  sol_usuario: string;
  sol_clave: string;
  sol_endpoint: 'beta' | 'prod';
  logo_url?: string;
}

@Component({
  selector: 'app-configuracion-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-24">
      <div>
        <h5 class="text-heading fw-semibold mb-8">Configuración de Empresa</h5>
        <p class="text-gray-500 mb-0">Configura los datos de tu empresa para facturación electrónica</p>
      </div>
      <div class="d-flex gap-12">
        <button 
          class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
          (click)="cargarDatos()">
          <i class="ph ph-arrow-clockwise me-8"></i>
          Actualizar
        </button>
        <button 
          class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
          (click)="guardar()"
          [disabled]="!empresaForm.valid || guardando">
          <span *ngIf="guardando" class="spinner-border spinner-border-sm me-8"></span>
          <i *ngIf="!guardando" class="ph ph-floppy-disk me-8"></i>
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>

    <!-- Formulario de configuración -->
    <div class="card border-0 shadow-sm rounded-12">
      <div class="card-body p-24">
        <form [formGroup]="empresaForm" (ngSubmit)="guardar()">
          <div class="row">
            <!-- Datos básicos -->
            <div class="col-md-6">
              <h6 class="text-heading fw-semibold mb-16">Datos Básicos</h6>
              
              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">RUC <span class="text-danger">*</span></label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="ruc" 
                       placeholder="20123456789" maxlength="11">
                <div *ngIf="empresaForm.get('ruc')?.invalid && empresaForm.get('ruc')?.touched" 
                     class="text-danger small mt-4">RUC es requerido (11 dígitos)</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Razón Social <span class="text-danger">*</span></label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="razon_social" 
                       placeholder="MI EMPRESA SAC">
                <div *ngIf="empresaForm.get('razon_social')?.invalid && empresaForm.get('razon_social')?.touched" 
                     class="text-danger small mt-4">Razón social es requerida</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Nombre Comercial</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="nombre_comercial" 
                       placeholder="Mi Empresa">
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Domicilio Fiscal <span class="text-danger">*</span></label>
                <textarea class="form-control px-16 py-12 border rounded-8" formControlName="domicilio_fiscal" 
                          rows="3" placeholder="Av. Principal 123, Lima"></textarea>
                <div *ngIf="empresaForm.get('domicilio_fiscal')?.invalid && empresaForm.get('domicilio_fiscal')?.touched" 
                     class="text-danger small mt-4">Domicilio fiscal es requerido</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Email <span class="text-danger">*</span></label>
                <input type="email" class="form-control px-16 py-12 border rounded-8" formControlName="email" 
                       placeholder="empresa@ejemplo.com">
                <div *ngIf="empresaForm.get('email')?.invalid && empresaForm.get('email')?.touched" 
                     class="text-danger small mt-4">Email válido es requerido</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Teléfono</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="telefono" 
                       placeholder="+51 999 999 999">
              </div>
            </div>

            <!-- Datos SUNAT -->
            <div class="col-md-6">
              <h6 class="text-heading fw-semibold mb-16">Credenciales SUNAT</h6>
              
              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Usuario SOL <span class="text-danger">*</span></label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="sol_usuario" 
                       placeholder="usuario_sol">
                <div *ngIf="empresaForm.get('sol_usuario')?.invalid && empresaForm.get('sol_usuario')?.touched" 
                     class="text-danger small mt-4">Usuario SOL es requerido</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Clave SOL <span class="text-danger">*</span></label>
                <div class="input-group">
                  <input [type]="mostrarClave ? 'text' : 'password'" class="form-control px-16 py-12 border rounded-start-8" 
                         formControlName="sol_clave" placeholder="••••••••">
                  <button type="button" class="btn btn-outline-secondary rounded-end-8" 
                          (click)="mostrarClave = !mostrarClave">
                    <i [class]="mostrarClave ? 'ph ph-eye-slash' : 'ph ph-eye'"></i>
                  </button>
                </div>
                <div *ngIf="empresaForm.get('sol_clave')?.invalid && empresaForm.get('sol_clave')?.touched" 
                     class="text-danger small mt-4">Clave SOL es requerida</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Ambiente <span class="text-danger">*</span></label>
                <select class="form-select px-16 py-12 border rounded-8" formControlName="sol_endpoint">
                  <option value="beta">Beta (Pruebas)</option>
                  <option value="prod">Producción</option>
                </select>
                <div class="form-text text-gray-500 mt-4">
                  <i class="ph ph-info me-4"></i>
                  Beta para pruebas, Producción para facturación real
                </div>
              </div>

              <!-- Ubicación -->
              <h6 class="text-heading fw-semibold mb-16 mt-32">Ubicación</h6>
              
              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Ubigeo</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="ubigeo" 
                       placeholder="150101" maxlength="6">
                <div class="form-text text-gray-500 mt-4">Código de 6 dígitos del ubigeo</div>
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Departamento</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="departamento" 
                       placeholder="Lima">
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Provincia</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="provincia" 
                       placeholder="Lima">
              </div>

              <div class="mb-24">
                <label class="form-label text-heading fw-medium mb-8">Distrito</label>
                <input type="text" class="form-control px-16 py-12 border rounded-8" formControlName="distrito" 
                       placeholder="Miraflores">
              </div>
            </div>
          </div>

          <!-- Logo de la empresa -->
          <div class="row mt-24">
            <div class="col-12">
              <h6 class="text-heading fw-semibold mb-16">Logo de la Empresa</h6>
              <div class="d-flex align-items-center gap-16">
                <div class="w-80 h-80 border border-gray-200 rounded-8 flex-center bg-gray-50">
                  <img *ngIf="empresaForm.get('logo_url')?.value" 
                       [src]="empresaForm.get('logo_url')?.value" 
                       alt="Logo" class="w-100 h-100 object-fit-cover rounded-8">
                  <i *ngIf="!empresaForm.get('logo_url')?.value" class="ph ph-image text-gray-400 text-2xl"></i>
                </div>
                <div>
                  <input type="file" class="form-control px-16 py-12 border rounded-8" 
                         accept="image/*" (change)="onLogoChange($event)">
                  <div class="form-text text-gray-500 mt-4">
                    <i class="ph ph-info me-4"></i>
                    Sube el logo de tu empresa (JPG, PNG, máximo 2MB)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Información importante -->
          <div class="alert alert-info border-0 rounded-12 mt-24">
            <h6 class="alert-heading text-heading fw-semibold">
              <i class="ph ph-info me-8"></i> Información Importante
            </h6>
            <ul class="mb-0 text-gray-600">
              <li>Los datos marcados con <span class="text-danger">*</span> son obligatorios</li>
              <li>Verifica que el RUC sea correcto antes de guardar</li>
              <li>Las credenciales SOL deben ser válidas y activas</li>
              <li>En ambiente Beta puedes hacer pruebas sin afectar la facturación real</li>
              <li>El logo aparecerá en tus comprobantes electrónicos</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .object-fit-cover {
        object-fit: cover;
      }
    `,
  ],
})
export class ConfiguracionEmpresaComponent implements OnInit {
  empresaForm: FormGroup;
  guardando = false;
  mostrarClave = false;

  constructor(
    private fb: FormBuilder,
    private facturacionService: FacturacionService
  ) {
    this.empresaForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      razon_social: ['', Validators.required],
      nombre_comercial: [''],
      domicilio_fiscal: ['', Validators.required],
      ubigeo: ['', Validators.pattern(/^\d{6}$/)],
      departamento: [''],
      provincia: [''],
      distrito: [''],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      sol_usuario: ['', Validators.required],
      sol_clave: ['', Validators.required],
      sol_endpoint: ['beta', Validators.required],
      logo_url: ['']
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.facturacionService.getEmpresa().subscribe({
      next: (response) => {
        const empresa = response.data;
        this.empresaForm.patchValue(empresa);
      },
      error: (error) => {
        console.error('Error al cargar datos de empresa:', error);
        Swal.fire('Error', 'No se pudieron cargar los datos de la empresa', 'error');
      }
    });
  }

  guardar(): void {
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      Swal.fire('Error', 'Por favor completa todos los campos obligatorios', 'error');
      return;
    }

    this.guardando = true;
    const datos = this.empresaForm.value;

    this.facturacionService.updateEmpresa(datos).subscribe({
      next: (response) => {
        this.guardando = false;
        Swal.fire('Éxito', 'Configuración guardada correctamente', 'success');
        console.log('Empresa actualizada:', response);
      },
      error: (error) => {
        this.guardando = false;
        Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
        console.error('Error al actualizar empresa:', error);
      }
    });
  }

  onLogoChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño (2MB máximo)
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire('Error', 'El archivo es demasiado grande. Máximo 2MB', 'error');
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Solo se permiten archivos de imagen', 'error');
        return;
      }

      // Crear URL temporal para previsualización
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.empresaForm.patchValue({ logo_url: e.target.result });
      };
      reader.readAsDataURL(file);

      // Aquí deberías subir el archivo al servidor
      // Por ahora solo mostramos la previsualización
      Swal.fire('Info', 'Funcionalidad de subida de logo en desarrollo', 'info');
    }
  }
}