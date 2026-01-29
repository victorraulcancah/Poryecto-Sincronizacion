import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { ReclamosService, Reclamo } from '../../services/reclamos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-claimbook',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbComponent, ShippingComponent],
  templateUrl: './claimbook.component.html',
  styleUrl: './claimbook.component.scss'
})
export class ClaimbookComponent implements OnInit {
  claimbookForm!: FormGroup;
  isSubmitting = false;
  currentDate = new Date().toLocaleDateString('es-PE');
  claimNumber = this.generateClaimNumber();

  // Datos de la empresa
  companyInfo = {
    name: 'MAGUS ECOMMERCE E.I.R.L.',
    ruc: '20601907063',
    address: 'Av. Ejemplo 123, Lima, Perú',
    store: 'Tienda Virtual - E-commerce'
  };

  constructor(
    private fb: FormBuilder,
    private reclamosService: ReclamosService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.claimbookForm = this.fb.group({
      // Datos del consumidor
      consumidor_nombre: ['', [Validators.required, Validators.minLength(2)]],
      consumidor_direccion: ['', [Validators.required]],
      consumidor_dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      consumidor_telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      consumidor_email: ['', [Validators.required, Validators.email]],
      es_menor_edad: [false],
      
      // Datos del apoderado (si es menor de edad)
      apoderado_nombre: [''],
      apoderado_direccion: [''],
      apoderado_dni: [''],
      apoderado_telefono: [''],
      apoderado_email: [''],
      
      // Identificación del bien contratado
      tipo_bien: ['producto', Validators.required], // producto o servicio
      monto_reclamado: ['', [Validators.required, Validators.min(0)]],
      descripcion_bien: ['', [Validators.required, Validators.minLength(10)]],
      
      // Detalle de la reclamación
      tipo_solicitud: ['reclamo', Validators.required], // reclamo o queja
      detalle_reclamo: ['', [Validators.required, Validators.minLength(20)]],
      pedido_consumidor: ['', [Validators.required, Validators.minLength(10)]],
      
      // Observaciones del proveedor
      respuesta_proveedor: [''],
      fecha_respuesta: [''],
      
      // Términos y condiciones
      acceptTerms: [false, Validators.requiredTrue]
    });

    // Validaciones condicionales para menor de edad
    this.claimbookForm.get('es_menor_edad')?.valueChanges.subscribe(isMinor => {
      const guardianFields = ['apoderado_nombre', 'apoderado_direccion', 'apoderado_dni', 'apoderado_telefono', 'apoderado_email'];
      
      if (isMinor) {
        guardianFields.forEach(field => {
          this.claimbookForm.get(field)?.setValidators([Validators.required]);
          if (field === 'apoderado_dni') {
            this.claimbookForm.get(field)?.setValidators([Validators.required, Validators.pattern(/^\d{8}$/)]);
          }
          if (field === 'apoderado_telefono') {
            this.claimbookForm.get(field)?.setValidators([Validators.required, Validators.pattern(/^\d{9}$/)]);
          }
          if (field === 'apoderado_email') {
            this.claimbookForm.get(field)?.setValidators([Validators.required, Validators.email]);
          }
        });
      } else {
        guardianFields.forEach(field => {
          this.claimbookForm.get(field)?.clearValidators();
        });
      }
      
      guardianFields.forEach(field => {
        this.claimbookForm.get(field)?.updateValueAndValidity();
      });
    });
  }

  private generateClaimNumber(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${randomNum}-${year}`;
  }

  onSubmit(): void {
    if (this.claimbookForm.valid) {
      this.isSubmitting = true;
      
      // Preparar los datos del reclamo
      const formValue = this.claimbookForm.value;
      const reclamoData: Reclamo = {
        ...formValue
      };
      
      // Eliminar el campo acceptTerms ya que no es parte del modelo
      delete (reclamoData as any).acceptTerms;
      
      // Si no es menor de edad, limpiar campos del apoderado
      if (!reclamoData.es_menor_edad) {
        reclamoData.apoderado_nombre = undefined;
        reclamoData.apoderado_dni = undefined;
        reclamoData.apoderado_direccion = undefined;
        reclamoData.apoderado_telefono = undefined;
        reclamoData.apoderado_email = undefined;
      }
      
      this.reclamosService.crearReclamo(reclamoData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          
          if (response.status === 'success' && response.reclamo) {
            Swal.fire({
              title: '¡Reclamo registrado exitosamente!',
              html: `
                <div class="text-start">
                  <p><strong>Número de reclamo:</strong> ${response.reclamo.numero_reclamo}</p>
                  <p><strong>Fecha:</strong> ${this.currentDate}</p>
                  <p class="text-sm text-gray-600 mt-3">
                    Su reclamo ha sido registrado correctamente. Recibirá una respuesta 
                    en un plazo no mayor a 30 días calendario.
                  </p>
                  <div class="mt-3 p-3 bg-info-50 rounded">
                    <p class="text-sm mb-0">
                      <strong>Importante:</strong> Guarde el número de reclamo para consultas futuras.
                    </p>
                  </div>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#198754'
            }).then(() => {
              this.resetForm();
            });
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error al enviar reclamo:', error);
          
          let errorMessage = 'Error al procesar su reclamo. Intente nuevamente.';
          
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          
          if (error.error && error.error.errors) {
            const errors = Object.values(error.error.errors).flat();
            errorMessage = errors.join('<br>');
          }
          
          Swal.fire({
            title: 'Error al enviar reclamo',
            html: errorMessage,
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
        }
      });
    } else {
      this.markFormGroupTouched();
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos',
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.claimbookForm.controls).forEach(key => {
      const control = this.claimbookForm.get(key);
      control?.markAsTouched();
    });
  }

  private resetForm(): void {
    this.claimbookForm.reset();
    this.claimbookForm.patchValue({
      tipo_bien: 'producto',
      tipo_solicitud: 'reclamo',
      es_menor_edad: false,
      acceptTerms: false
    });
    this.claimNumber = this.generateClaimNumber();
  }

  // Métodos de validación para el template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.claimbookForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.claimbookForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Ingrese un email válido';
      if (field.errors['pattern']) {
        if (fieldName.includes('Dni')) return 'DNI debe tener 8 dígitos';
        if (fieldName.includes('Phone')) return 'Teléfono debe tener 9 dígitos';
      }
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return 'El monto debe ser mayor a 0';
    }
    return '';
  }

  // Método para imprimir el formulario
  printForm(): void {
    window.print();
  }

  // Método para limpiar el formulario
  clearForm(): void {
    Swal.fire({
      title: '¿Limpiar formulario?',
      text: 'Se perderán todos los datos ingresados',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.resetForm();
        Swal.fire({
          title: 'Formulario limpiado',
          text: 'El formulario ha sido reiniciado',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }
}