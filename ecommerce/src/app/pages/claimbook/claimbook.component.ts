import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReclamosService, Reclamo } from '../../services/reclamos.service';
import { AuthService } from '../../services/auth.service';
import { ClientePortalService } from '../../services/cliente-portal.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-claimbook',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './claimbook.component.html',
  styleUrl: './claimbook.component.scss'
})
export class ClaimbookComponent implements OnInit, OnDestroy {
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

  private destroy$ = new Subject<void>();

  /** Se avisa en pantalla cuando los datos vienen de la cuenta. */
  datosPrecargados = false;

  constructor(
    private fb: FormBuilder,
    private reclamosService: ReclamosService,
    private authService: AuthService,
    private clientePortalService: ClientePortalService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.precargarDatosDelCliente();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * El libro es público, pero si el visitante tiene sesión se le adelantan sus
   * datos: los del cliente de 7Power cuando la cuenta está vinculada y, si no,
   * los de la propia cuenta. Todo queda editable antes de enviar.
   */
  private precargarDatosDelCliente(): void {
    const usuario = this.authService.getCurrentUser?.() ?? null;

    if (usuario) {
      this.claimbookForm.patchValue({
        consumidor_nombre: usuario.nombre_completo || usuario.name || '',
        consumidor_dni: usuario.numero_documento || '',
        consumidor_telefono: this.soloDigitos(usuario.telefono),
        consumidor_email: usuario.email || '',
      });
      this.datosPrecargados = true;
    }

    if (!this.authService.isLoggedIn()) return;

    this.clientePortalService
      .getTitular()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (titular) => {
          if (!titular?.vinculado) return;

          // Manda el cliente de 7Power: es a nombre de quien se factura.
          this.claimbookForm.patchValue({
            consumidor_nombre: titular.nombre || this.claimbookForm.value.consumidor_nombre,
            consumidor_dni: titular.documento || this.claimbookForm.value.consumidor_dni,
            consumidor_telefono:
              this.soloDigitos(titular.telefono) || this.claimbookForm.value.consumidor_telefono,
            consumidor_email: titular.email || this.claimbookForm.value.consumidor_email,
            consumidor_direccion: titular.direccion || this.claimbookForm.value.consumidor_direccion,
          });
          this.datosPrecargados = true;
        },
        // Si falla la consulta el formulario queda como estaba.
        error: () => {},
      });
  }

  /** El teléfono se guarda con 9 dígitos; los datos del ERP traen "+51 ...". */
  private soloDigitos(valor: string | null | undefined): string {
    const digitos = (valor || '').replace(/\D/g, '');
    return digitos.length > 9 ? digitos.slice(-9) : digitos;
  }

  private initializeForm(): void {
    this.claimbookForm = this.fb.group({
      // Datos del consumidor
      consumidor_nombre: ['', [Validators.required, Validators.minLength(2)]],
      consumidor_direccion: ['', [Validators.required]],
      // El formato depende del tipo de documento (ver `aplicarReglaDeDocumento`).
      consumidor_dni: ['', [Validators.required]],
      consumidor_telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      consumidor_email: ['', [Validators.required, Validators.email]],
      es_menor_edad: [false],
      
      // Datos del apoderado (si es menor de edad)
      apoderado_nombre: [''],
      apoderado_direccion: [''],
      apoderado_dni: [''],
      apoderado_telefono: [''],
      apoderado_email: [''],
      
      // Tipo de documento del consumidor (el PDF ya no asume DNI siempre)
      tipo_documento: ['DNI', Validators.required],

      // Información de la compra (opcional)
      tipo_comprobante: [''],
      numero_comprobante: [''],
      fecha_compra: [''],
      codigo_pedido: [''],
      codigo_producto: [''],
      nombre_producto: [''],
      marca: [''],
      modelo: [''],

      // Qué solución espera
      solucion_esperada: [''],
      otra_solucion: [''],

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
      
      // Confirmación (las tres casillas del formato)
      acceptTerms: [false, Validators.requiredTrue],
      aceptaDatos: [false, Validators.requiredTrue],
      conformeContenido: [false, Validators.requiredTrue]
    });

    // El número de documento se valida según el tipo elegido.
    this.aplicarReglaDeDocumento(this.claimbookForm.get('tipo_documento')?.value);
    this.claimbookForm
      .get('tipo_documento')
      ?.valueChanges.subscribe(tipo => this.aplicarReglaDeDocumento(tipo));

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

  /**
   * Formato del número según el tipo de documento:
   *   DNI                  8 dígitos
   *   RUC                  11 dígitos y empieza en 10, 15, 17 o 20
   *   Carné de extranjería 9 a 12 caracteres alfanuméricos
   *   Pasaporte            6 a 12 caracteres alfanuméricos
   */
  private static readonly REGLAS_DOCUMENTO: Record<string, { patron: RegExp; ayuda: string; maxlength: number }> = {
    'DNI': { patron: /^\d{8}$/, ayuda: 'El DNI debe tener 8 dígitos.', maxlength: 8 },
    'RUC': { patron: /^(10|15|17|20)\d{9}$/, ayuda: 'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20.', maxlength: 11 },
    'Carné de extranjería': { patron: /^[A-Za-z0-9]{9,12}$/, ayuda: 'El carné de extranjería debe tener entre 9 y 12 caracteres.', maxlength: 12 },
    'Pasaporte': { patron: /^[A-Za-z0-9]{6,12}$/, ayuda: 'El pasaporte debe tener entre 6 y 12 caracteres.', maxlength: 12 },
  };

  /** Texto de ayuda y tope de caracteres del documento activo. */
  get reglaDocumento(): { patron: RegExp; ayuda: string; maxlength: number } {
    const tipo = this.claimbookForm?.get('tipo_documento')?.value || 'DNI';
    return ClaimbookComponent.REGLAS_DOCUMENTO[tipo] ?? ClaimbookComponent.REGLAS_DOCUMENTO['DNI'];
  }

  private aplicarReglaDeDocumento(tipo: string): void {
    const control = this.claimbookForm.get('consumidor_dni');
    if (!control) return;

    const regla = ClaimbookComponent.REGLAS_DOCUMENTO[tipo] ?? ClaimbookComponent.REGLAS_DOCUMENTO['DNI'];
    control.setValidators([Validators.required, Validators.pattern(regla.patron)]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  /** Opciones del desplegable "¿Qué solución espera?". */
  readonly solucionesEsperadas = [
    'Cambio de producto',
    'Devolución del dinero',
    'Reparación',
    'Cumplimiento del servicio',
    'Otro',
  ];

  readonly tiposDocumento = ['DNI', 'RUC', 'Carné de extranjería', 'Pasaporte'];
  readonly tiposComprobante = ['Boleta', 'Factura', 'Nota de venta', 'Otro'];

  /** Archivos elegidos en el bloque 5; viajan como multipart al backend. */
  adjuntos: { foto: File | null; factura: File | null; video: File | null } = {
    foto: null,
    factura: null,
    video: null,
  };

  onArchivoSeleccionado(campo: 'foto' | 'factura' | 'video', evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;

    // Los mismos topes que valida el backend.
    const topeMb = campo === 'video' ? 20 : 5;
    if (archivo.size > topeMb * 1024 * 1024) {
      Swal.fire({
        title: 'Archivo muy pesado',
        text: `El archivo no puede pasar de ${topeMb} MB.`,
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      input.value = '';
      return;
    }

    this.adjuntos[campo] = archivo;
  }

  quitarAdjunto(campo: 'foto' | 'factura' | 'video'): void {
    this.adjuntos[campo] = null;
  }

  /** Pasa el reclamo y sus archivos a `FormData`. */
  private armarFormData(reclamo: Reclamo): FormData {
    const datos = new FormData();

    Object.entries(reclamo as unknown as Record<string, unknown>).forEach(([clave, valor]) => {
      if (valor === null || valor === undefined || valor === '') return;
      datos.append(clave, typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor));
    });

    if (this.adjuntos.foto) datos.append('foto', this.adjuntos.foto);
    if (this.adjuntos.factura) datos.append('factura', this.adjuntos.factura);
    if (this.adjuntos.video) datos.append('video', this.adjuntos.video);

    return datos;
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
      delete (reclamoData as any).aceptaDatos;
      delete (reclamoData as any).conformeContenido;
      
      // Si no es menor de edad, limpiar campos del apoderado
      if (!reclamoData.es_menor_edad) {
        reclamoData.apoderado_nombre = undefined;
        reclamoData.apoderado_dni = undefined;
        reclamoData.apoderado_direccion = undefined;
        reclamoData.apoderado_telefono = undefined;
        reclamoData.apoderado_email = undefined;
      }
      
      // Con adjuntos el envío va como multipart; sin ellos, JSON como siempre.
      const hayAdjuntos = !!(this.adjuntos.foto || this.adjuntos.factura || this.adjuntos.video);
      const envio = hayAdjuntos
        ? this.reclamosService.crearReclamoConAdjuntos(this.armarFormData(reclamoData))
        : this.reclamosService.crearReclamo(reclamoData);

      envio.subscribe({
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
      tipo_documento: 'DNI',
      tipo_bien: 'producto',
      tipo_solicitud: 'reclamo',
      es_menor_edad: false,
      acceptTerms: false,
      aceptaDatos: false,
      conformeContenido: false
    });
    this.adjuntos = { foto: null, factura: null, video: null };
    this.claimNumber = this.generateClaimNumber();
    // Si hay sesión, el formulario vuelve a quedar con los datos de la cuenta.
    this.datosPrecargados = false;
    this.precargarDatosDelCliente();
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