// src/app/components/modal-direccion/modal-direccion.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  DireccionesService,
  Direccion,
} from '../../services/direcciones.service';
import {
  UbigeoService,
  Departamento,
  Provincia,
  Distrito,
} from '../../services/ubigeo.service';

@Component({
  selector: 'app-modal-direccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalDireccion" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ direccion ? 'Editar Dirección' : 'Nueva Dirección' }}
            </h5>
            <button
              type="button"
              class="btn-close"
              (click)="cerrarModal()"
            ></button>
          </div>

          <div class="modal-body p-24">
            <!-- Mensaje de error -->
            <div *ngIf="error" class="alert alert-danger mb-16">
              {{ error }}
            </div>

            <form [formGroup]="direccionForm" (ngSubmit)="onSubmit()">
              <!-- Nombre del destinatario -->
              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Nombre del destinatario *</label
                >
                <input
                  type="text"
                  class="form-control px-16 py-12 border rounded-8"
                  [class.is-invalid]="
                    direccionForm.get('nombre_destinatario')?.invalid &&
                    direccionForm.get('nombre_destinatario')?.touched
                  "
                  formControlName="nombre_destinatario"
                  placeholder="¿A nombre de quién?"
                />
                <div
                  class="invalid-feedback"
                  *ngIf="
                    direccionForm.get('nombre_destinatario')?.invalid &&
                    direccionForm.get('nombre_destinatario')?.touched
                  "
                >
                  El nombre del destinatario es requerido
                </div>
              </div>

              <!-- Ubicación -->
              <div class="row">
                <div class="col-md-4 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Departamento *</label
                  >
                  <select
                    class="form-select px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      direccionForm.get('departamento_id')?.invalid &&
                      direccionForm.get('departamento_id')?.touched
                    "
                    formControlName="departamento_id"
                  >
                    <option value="">Seleccionar</option>
                    <option
                      *ngFor="let dept of departamentos"
                      [value]="dept.id"
                    >
                      {{ dept.nombre }}
                    </option>
                  </select>
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      direccionForm.get('departamento_id')?.invalid &&
                      direccionForm.get('departamento_id')?.touched
                    "
                  >
                    Selecciona un departamento
                  </div>
                </div>

                <div class="col-md-4 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Provincia *</label
                  >
                  <select
                    class="form-select px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      direccionForm.get('provincia_id')?.invalid &&
                      direccionForm.get('provincia_id')?.touched
                    "
                    formControlName="provincia_id"
                  >
                    <option value="">Seleccionar</option>
                    <option *ngFor="let prov of provincias" [value]="prov.id">
                      {{ prov.nombre }}
                    </option>
                  </select>
                  <div
                    *ngIf="isLoadingProvincias"
                    class="text-muted text-xs mt-4"
                  >
                    Cargando provincias...
                  </div>
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      direccionForm.get('provincia_id')?.invalid &&
                      direccionForm.get('provincia_id')?.touched
                    "
                  >
                    Selecciona una provincia
                  </div>
                </div>

                <div class="col-md-4 mb-16">
                  <label class="form-label text-heading fw-medium mb-8"
                    >Distrito *</label
                  >
                  <select
                    class="form-select px-16 py-12 border rounded-8"
                    [class.is-invalid]="
                      direccionForm.get('distrito_id')?.invalid &&
                      direccionForm.get('distrito_id')?.touched
                    "
                    formControlName="distrito_id"
                  >
                    <option value="">Seleccionar</option>
                    <option *ngFor="let dist of distritos" [value]="dist.id">
                      {{ dist.nombre }}
                    </option>
                  </select>
                  <div
                    *ngIf="isLoadingDistritos"
                    class="text-muted text-xs mt-4"
                  >
                    Cargando distritos...
                  </div>
                  <div
                    class="invalid-feedback"
                    *ngIf="
                      direccionForm.get('distrito_id')?.invalid &&
                      direccionForm.get('distrito_id')?.touched
                    "
                  >
                    Selecciona un distrito
                  </div>
                </div>
              </div>

              <!-- Dirección completa -->
              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Dirección completa *</label
                >
                <textarea
                  class="form-control px-16 py-12 border rounded-8"
                  rows="3"
                  [class.is-invalid]="
                    direccionForm.get('direccion_completa')?.invalid &&
                    direccionForm.get('direccion_completa')?.touched
                  "
                  formControlName="direccion_completa"
                  placeholder="Av/Jr/Calle, número, manzana, lote, interior, referencias..."
                ></textarea>
                <div
                  class="invalid-feedback"
                  *ngIf="
                    direccionForm.get('direccion_completa')?.invalid &&
                    direccionForm.get('direccion_completa')?.touched
                  "
                >
                  La dirección completa es requerida
                </div>
              </div>

              <!-- Teléfono -->
              <div class="mb-16">
                <label class="form-label text-heading fw-medium mb-8"
                  >Teléfono (opcional)</label
                >
                <input
                  type="tel"
                  class="form-control px-16 py-12 border rounded-8"
                  formControlName="telefono"
                  placeholder="999 999 999"
                />
              </div>

              <!-- Dirección predeterminada -->
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  formControlName="predeterminada"
                  id="predeterminada"
                />
                <label
                  class="form-check-label text-heading fw-medium"
                  for="predeterminada"
                >
                  Establecer como dirección principal
                </label>
              </div>

              <!-- Campo oculto para ubigeo -->
              <input type="hidden" formControlName="id_ubigeo" />
            </form>
          </div>

          <div class="modal-footer border-0 pt-0">
            <button
              type="button"
              class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
              (click)="cerrarModal()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
              [disabled]="isLoading || !isFormValid()"
              [class.btn-enabled]="!isLoading && isFormValid()"
              (click)="onSubmit()"
            >
              <span
                *ngIf="isLoading"
                class="spinner-border spinner-border-sm me-8"
              ></span>
              <i *ngIf="!isLoading" class="ph ph-check me-8"></i>
              {{
                isLoading
                  ? 'Guardando...'
                  : direccion
                  ? 'Actualizar'
                  : 'Guardar'
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ModalDireccionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() show: boolean = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() direccion: Direccion | null = null;
  @Input() departamentos: Departamento[] = [];
  @Output() direccionGuardada = new EventEmitter<void>();
  @Output() modalCerrado = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  direccionForm: FormGroup;
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];
  isLoadingProvincias = false;
  isLoadingDistritos = false;
  isLoading = false;
  error = '';
  private lastValidationState: boolean = false; // Para evitar re-renderizaciones constantes
  private setLoadingInitialData!: (loading: boolean) => void; // Método para controlar listeners

  constructor(
    private fb: FormBuilder,
    private direccionesService: DireccionesService,
    private ubigeoService: UbigeoService,
    private cdr: ChangeDetectorRef
  ) {
    this.direccionForm = this.fb.group({
      nombre_destinatario: [
        '',
        [Validators.required, Validators.maxLength(255)],
      ],
      direccion_completa: ['', [Validators.required]],
      telefono: ['', [Validators.maxLength(20)]],
      departamento_id: [''],
      provincia_id: [{ value: '', disabled: true }], // Inicialmente disabled
      distrito_id: [{ value: '', disabled: true }], // Inicialmente disabled
      id_ubigeo: ['', Validators.required], // Cambiado de ubigeo_id a id_ubigeo
      predeterminada: [false],
    });
  }

  ngOnInit(): void {
    console.log('🎯 ModalDireccionComponent ngOnInit ejecutándose...');
    console.log('📝 Dirección recibida en ngOnInit:', this.direccion);
    
    this.setupUbigeoListeners();

    // ELIMINADO: setInterval que causaba bucle infinito
    // Solo verificar el estado una vez al inicializar
    if (this.direccion) {
      console.log('✅ Hay dirección en ngOnInit, cargando datos...');
      this.loadDireccionData();
    } else {
      console.log('❌ No hay dirección en ngOnInit');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ngOnChanges ejecutándose...', changes);

    // Manejar cambios en la propiedad 'show' para mostrar/ocultar el modal
    if (changes['show']) {
      if (this.show) {
        this.mostrarModal();
      } else {
        this.ocultarModal();
      }
    }

    if (changes['direccion'] && this.direccionForm) {
      console.log('✅ Cambio detectado en dirección, llamando a loadDireccionData');
      this.loadDireccionData();
    } else {
      console.log('❌ No se cumplen las condiciones para cargar datos');
    }
  }

  ngOnDestroy(): void {
    // Limpiar el estado de validación
    this.lastValidationState = false;
  }

  setupUbigeoListeners(): void {
    // Variable para controlar cuando se están cargando datos iniciales
    let isLoadingInitialData = false;
    
    // Escuchar cambios en departamento
    this.direccionForm
      .get('departamento_id')
      ?.valueChanges.subscribe((departamentoId) => {
        if (departamentoId && !isLoadingInitialData) {
          this.loadProvincias(departamentoId);
          this.direccionForm.patchValue({
            provincia_id: '',
            distrito_id: '',
            id_ubigeo: '',
          });
          this.provincias = [];
          this.distritos = [];
          // Habilitar provincia
          this.direccionForm.get('provincia_id')?.enable();
        } else if (!departamentoId && !isLoadingInitialData) {
          this.direccionForm.get('provincia_id')?.disable();
          this.direccionForm.get('distrito_id')?.disable();
        }
      });

    // Escuchar cambios en provincia
    this.direccionForm
      .get('provincia_id')
      ?.valueChanges.subscribe((provinciaId) => {
        const departamentoId = this.direccionForm.get('departamento_id')?.value;
        if (departamentoId && provinciaId && !isLoadingInitialData) {
          this.loadDistritos(departamentoId, provinciaId);
          this.direccionForm.patchValue({
            distrito_id: '',
            id_ubigeo: '',
          });
          this.distritos = [];
          // Habilitar distrito
          this.direccionForm.get('distrito_id')?.enable();
        } else if (!provinciaId && !isLoadingInitialData) {
          this.direccionForm.get('distrito_id')?.disable();
        }
      });

    // Escuchar cambios en distrito
    this.direccionForm
      .get('distrito_id')
      ?.valueChanges.subscribe((distritoId) => {
        if (distritoId && !isLoadingInitialData) {
          const distrito = this.distritos.find((d) => d.id === distritoId);
          if (distrito) {
            this.direccionForm.patchValue({
              id_ubigeo: distrito.id_ubigeo,
            });
          }
        }
      });
      
    // Método para desactivar/activar listeners durante carga inicial
    this.setLoadingInitialData = (loading: boolean) => {
      isLoadingInitialData = loading;
      console.log('🔧 setLoadingInitialData:', loading);
    };
  }

  loadDireccionData(): void {
    console.log('🚀 loadDireccionData ejecutándose...');
    
    if (this.direccion) {
      console.log('=== CARGANDO DATOS DE DIRECCIÓN ===');
      console.log('Dirección recibida:', this.direccion);
      
      // Extraer ubigeo_id del objeto ubigeo anidado
      const ubigeoId = this.direccion.id_ubigeo || this.direccion.ubigeo?.id_ubigeo;
      console.log(' id_ubigeo extraído:', ubigeoId);
      
      // Modo edición
      this.direccionForm.patchValue({
        nombre_destinatario: this.direccion.nombre_destinatario,
        direccion_completa: this.direccion.direccion_completa,
        telefono: this.direccion.telefono || '',
        predeterminada: this.direccion.predeterminada,
        id_ubigeo: ubigeoId, // Usar el ubigeo_id extraído
      });
      
      console.log('Valores establecidos en el formulario:', this.direccionForm.value);
      console.log('Estado del formulario después de patchValue:', {
        valid: this.direccionForm.valid,
        errors: this.direccionForm.errors,
        controls: Object.keys(this.direccionForm.controls).map(key => ({
          key,
          value: this.direccionForm.get(key)?.value,
          valid: this.direccionForm.get(key)?.valid,
          errors: this.direccionForm.get(key)?.errors
        }))
      });

      // Si tiene ubigeo_id, cargar la cadena de ubicación
      if (ubigeoId) {
        console.log('✅ Llamando a loadUbigeoChain con:', ubigeoId);
        this.loadUbigeoChain(ubigeoId);
      } else {
        console.log('❌ NO hay id_ubigeo disponible:', {
          direccion_ubigeo_id: this.direccion.id_ubigeo,
          ubigeo_anidado_id: this.direccion.ubigeo?.id_ubigeo
        });
      }

      // Forzar validación después de cargar los datos
      setTimeout(() => {
        this.direccionForm.updateValueAndValidity();
        console.log('Estado del formulario después de cargar datos:', {
          valid: this.direccionForm.valid,
          values: this.direccionForm.value,
        });
      }, 100);
    } else {
      // Modo creación
      this.direccionForm.reset({
        nombre_destinatario: '',
        direccion_completa: '',
        telefono: '',
        departamento_id: '',
        provincia_id: '',
        distrito_id: '',
        id_ubigeo: '',
        predeterminada: false,
      });
      this.provincias = [];
      this.distritos = [];
    }
  }

  loadUbigeoChain(ubigeoId: string): void {
    console.log('=== LOAD UBIGEO CHAIN ===');
    console.log('ubigeoId recibido:', ubigeoId);
    console.log('Tipo de ubigeoId:', typeof ubigeoId);

    // Usar el nuevo endpoint del backend para obtener la cadena completa
    this.ubigeoService.getUbigeoChain(ubigeoId).subscribe({
      next: (response) => {
        console.log('=== RESPUESTA COMPLETA DEL BACKEND ===');
        console.log('Response completo:', response);
        console.log('Response.status:', response.status);
        console.log('Response.data:', response.data);
        console.log('Tipo de response:', typeof response);
        console.log('Es array?', Array.isArray(response));
        console.log('=====================================');
        
        if (response.status === 'success') {
          const chain = response.data;
          console.log('Cadena de ubigeo obtenida:', chain);

          // Establecer inmediatamente el ubigeo_id para que el botón se habilite
          console.log('Estableciendo id_ubigeo:', ubigeoId);
          this.direccionForm.patchValue({
            id_ubigeo: ubigeoId,
          });
          
          console.log('id_ubigeo después de patchValue:', this.direccionForm.get('id_ubigeo')?.value);

          // Cargar provincias del departamento
          console.log('Cargando provincias para departamento:', chain.departamento.id);
          this.loadProvincias(chain.departamento.id);

          // Cargar distritos y esperar a que se complete la carga
          console.log('Cargando distritos para provincia:', chain.departamento.id, chain.provincia.id);
          this.isLoadingDistritos = true;
          this.ubigeoService.getDistritos(chain.departamento.id, chain.provincia.id).subscribe({
            next: (distritos) => {
              this.distritos = distritos;
              this.isLoadingDistritos = false;
              console.log('✅ Distritos cargados exitosamente:', distritos.length);
              
              // Ahora establecer los valores de los selects después de cargar las listas
              setTimeout(() => {
                console.log('=== ESTABLECIENDO VALORES DE SELECTS ===');
                
                // IMPORTANTE: Desactivar listeners durante la carga inicial
                this.setLoadingInitialData(true);
                
                // Habilitar todos los campos antes de establecer valores
                this.direccionForm.get('departamento_id')?.enable();
                this.direccionForm.get('provincia_id')?.enable();
                this.direccionForm.get('distrito_id')?.enable();

                const valores = {
                  departamento_id: chain.departamento.id,
                  provincia_id: chain.provincia.id,
                  distrito_id: chain.distrito.id,
                };
                
                console.log('Valores a establecer en selects:', valores);
                this.direccionForm.patchValue(valores);

                // IMPORTANTE: Calcular y establecer el ubigeo_id basado en la combinación
                const distritoSeleccionado = this.distritos.find(d => d.id === chain.distrito.id);
                
                if (distritoSeleccionado) {
                  console.log('✅ Distrito encontrado, estableciendo id_ubigeo:', distritoSeleccionado.id_ubigeo);
                  this.direccionForm.patchValue({
                    id_ubigeo: distritoSeleccionado.id_ubigeo
                  });
                } else {
                  console.log('❌ No se pudo encontrar el distrito para establecer id_ubigeo, usando ubigeo_id original');
                  // Fallback: usar el ubigeo_id original
                  this.direccionForm.patchValue({
                    id_ubigeo: ubigeoId
                  });
                }

                console.log('Formulario actualizado con valores de ubigeo');
                console.log('Estado del formulario:', {
                  valid: this.direccionForm.valid,
                  id_ubigeo: this.direccionForm.get('id_ubigeo')?.value,
                  departamento_id: this.direccionForm.get('departamento_id')?.value,
                  provincia_id: this.direccionForm.get('provincia_id')?.value,
                  distrito_id: this.direccionForm.get('distrito_id')?.value
                });
                
                // IMPORTANTE: Habilitar departamento después de establecer todos los valores
                this.direccionForm.get('departamento_id')?.enable();
                
                // VERIFICACIÓN FINAL: Asegurar que id_ubigeo no se haya perdido
                setTimeout(() => {
                  console.log('=== VERIFICACIÓN FINAL ===');
                  console.log('Estado final del formulario:', {
                    valid: this.direccionForm.valid,
                    id_ubigeo: this.direccionForm.get('id_ubigeo')?.value,
                    departamento_id: this.direccionForm.get('departamento_id')?.value,
                    provincia_id: this.direccionForm.get('provincia_id')?.value,
                    distrito_id: this.direccionForm.get('distrito_id')?.value
                  });
                  
                  // Si se perdió el id_ubigeo, restaurarlo
                  if (!this.direccionForm.get('id_ubigeo')?.value) {
                    console.log('⚠️ id_ubigeo se perdió, restaurándolo...');
                    this.direccionForm.patchValue({
                      id_ubigeo: ubigeoId
                    });
                    console.log('✅ id_ubigeo restaurado:', this.direccionForm.get('id_ubigeo')?.value);
                  }
                }, 50);
                
                // IMPORTANTE: Reactivar listeners después de establecer todos los valores
                setTimeout(() => {
                  this.setLoadingInitialData(false);
                  console.log('🔧 Listeners reactivados');
                }, 50);
                
                this.direccionForm.updateValueAndValidity();
                this.cdr.detectChanges();
              }, 100);
            },
            error: (error) => {
              console.error('Error cargando distritos:', error);
              this.isLoadingDistritos = false;
              // Desactivar listeners durante fallback
              this.setLoadingInitialData(true);
              
              // Fallback: usar el ubigeo_id original
              console.log('Fallback por error: estableciendo id_ubigeo:', ubigeoId);
              this.direccionForm.patchValue({
                id_ubigeo: ubigeoId,
                departamento_id: chain.departamento.id,
                provincia_id: chain.provincia.id,
                distrito_id: chain.distrito.id,
              });
              this.direccionForm.get('departamento_id')?.enable();
              this.direccionForm.get('provincia_id')?.enable();
              this.direccionForm.get('distrito_id')?.enable();
              
              // Reactivar listeners después del fallback
              setTimeout(() => {
                this.setLoadingInitialData(false);
                console.log('🔧 Listeners reactivados después del fallback');
              }, 100);
            }
          });
        } else {
          console.error('Respuesta del backend no exitosa:', response);
        }
      },
      error: (error) => {
        console.error('Error obteniendo cadena de ubigeo:', error);
        // Fallback: solo establecer el ubigeo_id
        console.log('Fallback: estableciendo id_ubigeo:', ubigeoId);
        this.direccionForm.patchValue({
          id_ubigeo: ubigeoId,
        });
      },
    });
  }

  loadProvincias(departamentoId: string): void {
    this.isLoadingProvincias = true;
    this.ubigeoService.getProvincias(departamentoId).subscribe({
      next: (provincias) => {
        this.provincias = provincias;
        this.isLoadingProvincias = false;
      },
      error: (error) => {
        console.error('Error cargando provincias:', error);
        this.isLoadingProvincias = false;
      },
    });
  }

  loadDistritos(departamentoId: string, provinciaId: string): void {
    this.isLoadingDistritos = true;
    this.ubigeoService.getDistritos(departamentoId, provinciaId).subscribe({
      next: (distritos) => {
        this.distritos = distritos;
        this.isLoadingDistritos = false;
      },
      error: (error) => {
        console.error('Error cargando distritos:', error);
        this.isLoadingDistritos = false;
      },
    });
  }

  // Método para verificar si el formulario es válido
  isFormValid(): boolean {
    // Usar la validación nativa del formulario
    const formValid = this.direccionForm.valid;
    
    // Solo loggear cuando cambie el estado (no en cada verificación)
    if (this.lastValidationState !== formValid) {
      console.log('Estado del formulario cambiado:', { 
        from: this.lastValidationState, 
        to: formValid,
        formValid: formValid,
        values: this.direccionForm.value
      });
      
      // Si cambió a inválido, mostrar qué campos fallan (solo una vez)
      if (!formValid) {
        console.log('=== VALIDACIONES FALLANDO (solo una vez) ===');
        Object.keys(this.direccionForm.controls).forEach(key => {
          const control = this.direccionForm.get(key);
          if (control && control.invalid) {
            console.log(`Campo ${key}:`, {
              value: control.value,
              errors: control.errors,
              valid: control.valid,
              touched: control.touched
            });
          }
        });
        console.log('=============================================');
      }
      
      this.lastValidationState = formValid;
    }
  
    return formValid;
  }
  
  // Método para forzar actualización del botón
forceUpdate(): void {
  this.cdr.markForCheck();
  this.cdr.detectChanges();
}

  // Método para verificar el estado del formulario en tiempo real
  checkFormStatus(): void {
    const status = {
      nombre_destinatario: this.direccionForm.get('nombre_destinatario')?.value,
      direccion_completa: this.direccionForm.get('direccion_completa')?.value,
      id_ubigeo: this.direccionForm.get('id_ubigeo')?.value,
      isFormValid: this.isFormValid(),
      formValid: this.direccionForm.valid,
    };

    console.log('Estado del formulario:', status);
  }

  onSubmit(): void {
    if (this.direccionForm.valid) {
      this.isLoading = true;
      this.error = '';

      const formData = this.direccionForm.value;
      // NUEVA LÍNEA: Asegurarse de que ubigeo_id sea una cadena antes de enviar
      if (formData.id_ubigeo !== null && formData.id_ubigeo !== undefined) {
        formData.id_ubigeo = String(formData.id_ubigeo);
      }

      const request = this.direccion
        ? this.direccionesService.actualizarDireccion(
            this.direccion.id,
            formData
          )
        : this.direccionesService.crearDireccion(formData);

      request.subscribe({
        next: (response) => {
          console.log('Dirección guardada exitosamente:', response);
          this.direccionGuardada.emit();
          this.cerrarModal();
        },
        error: (error) => {
          console.error('Error al guardar dirección:', error);
          this.error = error.error?.message || 'Error al guardar la dirección';
          this.isLoading = false;
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.direccionForm.controls).forEach((key) => {
      const control = this.direccionForm.get(key);
      control?.markAsTouched();
    });
  }

  private mostrarModal(): void {
    setTimeout(() => {
      const modal = document.getElementById('modalDireccion');
      if (modal) {
        // Verificar si Bootstrap está disponible
        if (typeof (window as any).bootstrap !== 'undefined') {
          const bootstrapModal = new (window as any).bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: false
          });
          bootstrapModal.show();
        } else {
          // Fallback: mostrar modal manualmente
          modal.style.display = 'block';
          modal.classList.add('show');
          document.body.classList.add('modal-open');

          // Agregar backdrop manualmente
          const backdrop = document.createElement('div');
          backdrop.classList.add('modal-backdrop', 'fade', 'show');
          backdrop.id = 'modal-backdrop-direccion';
          document.body.appendChild(backdrop);
        }
      }
    }, 50);
  }

  private ocultarModal(): void {
    const modal = document.getElementById('modalDireccion');
    if (modal) {
      if (typeof (window as any).bootstrap !== 'undefined') {
        const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      } else {
        // Fallback: ocultar modal manualmente
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');

        // Remover backdrop manual
        const backdrop = document.getElementById('modal-backdrop-direccion');
        if (backdrop) {
          backdrop.remove();
        }
      }
    }
  }

  cerrarModal(): void {
    this.isLoading = false;
    this.ocultarModal();
    this.cerrar.emit();
  }
}
