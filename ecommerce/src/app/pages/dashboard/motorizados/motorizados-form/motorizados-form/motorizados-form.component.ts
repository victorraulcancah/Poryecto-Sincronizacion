import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MotorizadosService, Motorizado } from '../../../../../services/motorizados.service';
import { AuthService } from '../../../../../services/auth.service';
import { UbigeoService } from '../../../../../services/ubigeo.service';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

interface UbigeoData {
  provinces: any[];
  districts: any[];
}

interface CategoriaLicencia {
  [key: string]: string;
}

@Component({
  selector: 'app-motorizados-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './motorizados-form.component.html'
})
export class MotorizadosFormComponent implements OnInit {
  motorizadoForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  currentYear = new Date().getFullYear();
  
  // Data for selects
  documentTypes: any[] = [];
  categoriasLicencia: CategoriaLicencia = {};
  departamentos: any[] = [];
  provincias: any[] = [];
  distritos: any[] = [];
  selectedFile?: File;
  selectedFileName = '';
  previewUrl = '';

  // Credenciales generadas
  credencialesGeneradas: any = null;
  numeroUnidadGenerado = '';
  showCredencialesModal = false;

  // Validación de correo
  emailMessage = '';
  emailValid = false;
  emailChecking = false;

  private userId: number | null = null;
  private motorizadoId: number | null = null;
  private cargandoUbigeo = false;
  private addressUbigeoData: UbigeoData = { provinces: [], districts: [] };
  private motorizadoOriginal: Motorizado | null = null;

  constructor(
    private fb: FormBuilder,
    private motorizadosService: MotorizadosService,
    private authService: AuthService,
    private ubigeoService: UbigeoService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.motorizadoForm = this.fb.group({
      // Personal Information
      nombre_completo: ['', [Validators.required, Validators.maxLength(100)]],
      tipo_documento_id: ['', Validators.required],
      numero_documento: ['', [Validators.required, Validators.maxLength(20)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      
      // License Information
      licencia_numero: ['', [Validators.required, Validators.maxLength(50)]],
      licencia_categoria: ['', Validators.required],
      
      // Address Information
      departamento: ['', Validators.required],
      provincia: ['', Validators.required],
      ubigeo: ['', Validators.required],
      direccion_detalle: ['', [Validators.required, Validators.maxLength(255)]],
      
      // Vehicle Information
      vehiculo_marca: ['', [Validators.required, Validators.maxLength(50)]],
      vehiculo_modelo: ['', [Validators.required, Validators.maxLength(50)]],
      vehiculo_ano: ['', [Validators.required, Validators.min(1950), Validators.max(this.currentYear + 1)]],
      vehiculo_cilindraje: ['', [Validators.required, Validators.maxLength(20)]],
      vehiculo_placa: ['', [Validators.required, Validators.maxLength(10)]],
      vehiculo_color_principal: ['', [Validators.required, Validators.maxLength(30)]],
      vehiculo_color_secundario: ['', Validators.maxLength(30)],
      vehiculo_motor: ['', [Validators.required, Validators.maxLength(50)]],
      vehiculo_chasis: ['', [Validators.required, Validators.maxLength(50)]],
    
      comentario: ['', Validators.maxLength(500)],

      // Campos para crear usuario
      crear_usuario: [false],
      password: ['', [Validators.minLength(6)]]
    });
  }

  private loadInitialData(): void {
    this.loadDocumentTypes();
    this.loadCategoriasLicencia();
    this.loadDepartamentos();
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.motorizadoId = +id;
      this.loadMotorizado(this.motorizadoId);
    }
  }

  private async loadDocumentTypes(): Promise<void> {
  try {
    this.documentTypes = await firstValueFrom(this.authService.getDocumentTypes());
    console.log('Document types loaded from DB:', this.documentTypes);
  } catch (error) {
    console.error('Error loading document types:', error);
    this.toastr.error('Error al cargar los tipos de documento');
    // Fallback a datos mock solo en caso de error
    this.documentTypes = [
      { id: 1, nombre: 'DNI' },
      { id: 2, nombre: 'Carné de Extranjería' },
      { id: 3, nombre: 'Pasaporte' },
      { id: 4, nombre: 'Otro' }
    ];
  }
}

  private async loadCategoriasLicencia(): Promise<void> {
    try {
      this.categoriasLicencia = await firstValueFrom(this.motorizadosService.getCategoriasLicencia()) as CategoriaLicencia;
    } catch (error) {
      console.error('Error loading license categories:', error);
      this.toastr.error('Error al cargar las categorías de licencia');
    }
  }

  private async loadDepartamentos(): Promise<void> {
    try {
      this.departamentos = await firstValueFrom(this.ubigeoService.getDepartamentos());
    } catch (error) {
      console.error('Error loading departments:', error);
      this.toastr.error('Error al cargar los departamentos');
    }
  }

  async onDepartamentoChange(): Promise<void> {
    const departamentoId = this.motorizadoForm.get('departamento')?.value;
    if (!departamentoId) return;

    try {
      // Resetear provincias y distritos
      this.provincias = [];
      this.distritos = [];
      this.motorizadoForm.patchValue({ provincia: '', ubigeo: '' });
      
      // Encontrar el departamento seleccionado para obtener su código
      const selectedDepartment = this.departamentos.find(d => d.id_ubigeo == departamentoId);
      if (selectedDepartment) {
        console.log(`Cargando provincias para departamento código: ${selectedDepartment.id}`);
        this.provincias = await firstValueFrom(this.ubigeoService.getProvincias(selectedDepartment.id));
        console.log('Provincias cargadas:', this.provincias);
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
      this.toastr.error('Error al cargar las provincias');
    }
  }

  async onProvinciaChange(): Promise<void> {
    const departamentoId = this.motorizadoForm.get('departamento')?.value;
    const provinciaId = this.motorizadoForm.get('provincia')?.value;
    if (!departamentoId || !provinciaId) return;

    try {
      // Resetear distritos
      this.distritos = [];
      this.motorizadoForm.patchValue({ ubigeo: '' });
      
      // Obtener los códigos de departamento y provincia
      const selectedDepartment = this.departamentos.find(d => d.id_ubigeo == departamentoId);
      const selectedProvince = this.provincias.find(p => p.id_ubigeo == provinciaId);
      
      if (selectedDepartment && selectedProvince) {
        console.log(`Cargando distritos para departamento: ${selectedDepartment.id}, provincia: ${selectedProvince.id}`);
        this.distritos = await firstValueFrom(
          this.ubigeoService.getDistritos(selectedDepartment.id, selectedProvince.id)
        );
        console.log('Distritos cargados:', this.distritos);
      }
    } catch (error) {
      console.error('Error loading districts:', error);
      this.toastr.error('Error al cargar los distritos');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.match('image.*')) {
        this.toastr.error('Por favor seleccione un archivo de imagen válido');
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = undefined;
    this.selectedFileName = '';
    this.previewUrl = '';
    // Reset file input
    const fileInput = document.getElementById('foto-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.motorizadoForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFieldError(field: string): string {
    const control = this.motorizadoForm.get(field);
    if (!control?.errors) return '';

    if (control.errors['required']) {
      return 'Este campo es requerido';
    } else if (control.errors['email']) {
      return 'Ingrese un correo electrónico válido';
    } else if (control.errors['min']) {
      return `El valor mínimo permitido es ${control.errors['min'].min}`;
    } else if (control.errors['max']) {
      return `El valor máximo permitido es ${control.errors['max'].max}`;
    } else if (control.errors['maxlength']) {
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }

  // Validación de correo duplicado
  validateEmail(email: string): void {
    console.log('validateEmail ejecutado con:', email); // Debug
    if (!email || !this.isValidEmail(email)) {
      console.log('Email inválido o vacío'); // Debug
      this.emailMessage = '';
      this.emailValid = false;
      return;
    }

    // Solo validar si no estamos en modo edición o si el email cambió
    if (this.isEditMode) {
      const originalEmail = this.motorizadoOriginal?.correo;
      if (email === originalEmail) {
        this.emailMessage = '';
        this.emailValid = true;
        return;
      }
    }

    console.log('Iniciando validación de correo con API...'); // Debug
    this.emailChecking = true;
    this.authService.checkEmail(email).subscribe({
      next: (response) => {
        console.log('Respuesta de validación:', response); // Debug
        this.emailChecking = false;
        this.emailValid = !response.exists;
        this.emailMessage = response.message;
      },
      error: (error) => {
        console.error('Error al validar correo:', error); // Debug
        this.emailChecking = false;
        this.emailValid = false;
        this.emailMessage = 'Error al validar correo';
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onEmailBlur(): void {
    const email = this.motorizadoForm.get('correo')?.value;
    console.log('onEmailBlur ejecutado, email:', email); // Debug
    if (email) {
      this.validateEmail(email);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.motorizadoForm.invalid) {
      this.markFormGroupTouched(this.motorizadoForm);
      this.toastr.warning('Por favor complete todos los campos requeridos');
      return;
    }

    // Validar correo duplicado antes de enviar
    const email = this.motorizadoForm.get('correo')?.value;
    if (email && !this.isEditMode) {
      // Para nuevos motorizados, validar que el correo no exista
      try {
        const emailResponse = await firstValueFrom(this.authService.checkEmail(email));
        if (emailResponse.exists) {
          this.toastr.error('Este correo ya está registrado en el sistema');
          return;
        }
      } catch (error) {
        this.toastr.error('Error al validar el correo');
        return;
      }
    }

    this.isSubmitting = true;
    const formData = this.prepareFormData();

    // Debug: verificar qué se está enviando
    // (la contraseña no se imprime en consola)
    const { password: _password, ...valoresSinPassword } = this.motorizadoForm.value;
    console.log('Form values:', valoresSinPassword);
    console.log('FormData entries:');
    for (let pair of formData.entries()) {
      if (pair[0] === 'password') continue;
      console.log(pair[0] + ': ' + pair[1]);
    }

    try {
      if (this.isEditMode && this.motorizadoId) {
        await firstValueFrom(this.motorizadosService.actualizarMotorizado(this.motorizadoId, formData));
        this.toastr.success('Motorizado actualizado exitosamente');
        this.router.navigate(['/dashboard/motorizados']);
      } else {
        const response = await firstValueFrom(this.motorizadosService.crearMotorizado(formData));

        // Verificar si se crearon credenciales
        if (response.usuario_creado && response.credenciales) {
          this.credencialesGeneradas = response.credenciales;

          // Verificar si se usó la contraseña del usuario o se generó automática
          const passwordIngresado = this.motorizadoForm.get('password')?.value;
          const mensajePassword = passwordIngresado && passwordIngresado.trim() !== ''
            ? 'Se ha usado la contraseña que especificaste.'
            : 'Se generó una contraseña automática segura.';

          this.toastr.success(`¡Motorizado Creado Exitosamente!\nSe han generado las credenciales de acceso. ${mensajePassword}`);
          this.mostrarModalCredenciales(response);
        } else {
          this.toastr.success('Motorizado creado exitosamente');
          this.router.navigate(['/dashboard/motorizados']);
        }

        // Mostrar warning si hubo problema al crear usuario
        if (response.warning) {
          this.toastr.warning(response.warning);
        }
      }
    } catch (error) {
      console.error('Error saving motorizado:', error);
      this.toastr.error('Ocurrió un error al guardar el motorizado');
    } finally {
      this.isSubmitting = false;
    }
  }

  private prepareFormData(): FormData {
    const formData = new FormData();
    const formValue = this.motorizadoForm.value;
    
    // Append all form values except UI-only fields
    Object.keys(formValue).forEach(key => {
      // Skip departamento and provincia as they're only for UI, ubigeo contains the final value
      if (key === 'departamento' || key === 'provincia') {
        console.log(`Skipping ${key}: ${formValue[key]}`);
        return;
      }

      const value = formValue[key] || '';
      // No se imprime el valor de la contraseña en consola
      if (key !== 'password') {
        console.log(`Adding ${key}: ${value}`);
      }
      formData.append(key, value);
    });
  
    // Append file if exists
    if (this.selectedFile) {
      console.log('Adding file:', this.selectedFile.name);
      formData.append('foto_perfil', this.selectedFile, this.selectedFile.name);
    }
  
    // Add flag to remove photo if needed (for edit mode)
    if (this.isEditMode && !this.selectedFile && !this.previewUrl) {
      console.log('Adding eliminar_foto flag');
      formData.append('eliminar_foto', 'true');
    }
  
    return formData;
  }

  private async loadMotorizado(id: number): Promise<void> {
    this.isLoading = true;
    try {
      const motorizado = await firstValueFrom(this.motorizadosService.getMotorizado(id));
      this.motorizadoOriginal = motorizado; // Guardar referencia original
      this.patchFormWithMotorizadoData(motorizado);
    } catch (error) {
      console.error('Error loading motorizado:', error);
      this.toastr.error('Error al cargar los datos del motorizado');
      this.router.navigate(['/dashboard/motorizados']);
    } finally {
      this.isLoading = false;
    }
  }

  private async patchFormWithMotorizadoData(motorizado: any): Promise<void> {
    // Patch basic form values
    this.motorizadoForm.patchValue({
      nombre_completo: motorizado.nombre_completo,
      tipo_documento_id: motorizado.tipo_documento_id,
      numero_documento: motorizado.numero_documento,
      telefono: motorizado.telefono,
      correo: motorizado.correo,
      licencia_numero: motorizado.licencia_numero,
      licencia_categoria: motorizado.licencia_categoria,
      direccion_detalle: motorizado.direccion_detalle,
      vehiculo_marca: motorizado.vehiculo_marca,
      vehiculo_modelo: motorizado.vehiculo_modelo,
      vehiculo_ano: motorizado.vehiculo_ano,
      vehiculo_cilindraje: motorizado.vehiculo_cilindraje,
      vehiculo_placa: motorizado.vehiculo_placa,
      vehiculo_color_principal: motorizado.vehiculo_color_principal,
      vehiculo_color_secundario: motorizado.vehiculo_color_secundario,
      vehiculo_motor: motorizado.vehiculo_motor,
      vehiculo_chasis: motorizado.vehiculo_chasis,
      comentario: motorizado.comentario || '',
    });
  
    // Load ubigeo chain if ubigeo is present
    if (motorizado.ubigeo) {
      await this.loadUbigeoChain(motorizado.ubigeo.toString());
    }
  
    // Set preview image if exists
    if (motorizado.foto_perfil) {
      this.previewUrl = motorizado.foto_perfil;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control) {
        control.markAsTouched();
        
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        }
      }
    });
  }

  onCancel(): void {
    if (this.motorizadoForm.dirty) {
      Swal.fire({
        title: '¿Cancelar registro?',
        text: 'Los cambios no guardados se perderán permanentemente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Continuar editando'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/dashboard/motorizados']);
        }
      });
    } else {
      this.router.navigate(['/dashboard/motorizados']);
    }
  }

  compareUbigeo(item1: any, item2: any): boolean {
    return item1 && item2 ? item1.id_ubigeo === item2.id_ubigeo : item1 === item2;
  }

  private async loadProvinciasForUbigeo(departamentoId: string, selectedProvinciaId: string): Promise<void> {
    try {
      this.provincias = await firstValueFrom(this.ubigeoService.getProvincias(departamentoId));
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading provinces for ubigeo:', error);
      throw error;
    }
  }

  private async loadDistritosForUbigeo(departamentoId: string, provinciaId: string): Promise<void> {
    try {
      this.distritos = await firstValueFrom(
        this.ubigeoService.getDistritos(departamentoId, provinciaId)
      );
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading districts for ubigeo:', error);
      throw error;
    }
  }

// REEMPLAZAR la función loadUbigeoChain existente
// REEMPLAZAR la función loadUbigeoChain existente
async loadUbigeoChain(ubigeoId: string): Promise<void> {
  if (!ubigeoId) return;

  this.cargandoUbigeo = true;
  
  try {
    // Obtener información del ubigeo seleccionado
    const response = await firstValueFrom(this.ubigeoService.getUbigeoChain(ubigeoId));
    
    if (response?.status === 'success') {
      const { departamento, provincia, distrito } = response.data;
      
      // 1. Buscar el departamento en la lista cargada
      const departamentoEncontrado = this.departamentos.find(dept => 
        dept.id === departamento.id
      );
      
      if (departamentoEncontrado) {
        // 2. Establecer el departamento en el formulario
        this.motorizadoForm.patchValue({
          departamento: departamentoEncontrado.id_ubigeo
        });
        
        // 3. Cargar provincias usando el CÓDIGO del departamento (no el id_ubigeo)
        // El backend espera el código "20", no el id_ubigeo del departamento
        this.provincias = await firstValueFrom(this.ubigeoService.getProvincias(departamento.id));
        
        // 4. Si hay provincia válida (no es "00"), buscarla
        if (provincia.id !== "00") {
          const provinciaEncontrada = this.provincias.find(prov => 
            prov.id === provincia.id
          );
          
          if (provinciaEncontrada) {
            // 5. Establecer la provincia en el formulario
            this.motorizadoForm.patchValue({
              provincia: provinciaEncontrada.id_ubigeo
            });
            
            // 6. Cargar distritos usando los CÓDIGOS (no los id_ubigeo)
            this.distritos = await firstValueFrom(
              this.ubigeoService.getDistritos(departamento.id, provincia.id)
            );
            
            // 7. Si hay distrito válido (no es "00"), buscarlo y establecerlo
            if (distrito.id !== "00") {
              const distritoEncontrado = this.distritos.find(dist => 
                dist.distrito === distrito.id
              );
              
              if (distritoEncontrado) {
                this.motorizadoForm.patchValue({
                  ubigeo: distritoEncontrado.id_ubigeo
                });
              }
            } else {
              // Si distrito es "00", significa que el ubigeo seleccionado es la provincia
              this.motorizadoForm.patchValue({
                ubigeo: parseInt(ubigeoId)
              });
            }
          }
        }
        
        this.cdr.detectChanges();
      } else {
        console.error('No se encontró el departamento con código:', departamento.id);
      }
    }
  } catch (error) {
    console.error('Error loading ubigeo chain:', error);
    this.toastr.error('Error al cargar la ubicación');
  } finally {
    this.cargandoUbigeo = false;
  }
}

  // Funciones auxiliares para extraer códigos
  private getDepartamentoCode(id_ubigeo: string): string {
    // Asumiendo que el id_ubigeo del departamento termina en "0000"
    return id_ubigeo.substring(0, 2);
  }
  
  private getProvinciaCode(id_ubigeo: string): string {
    // Asumiendo que el id_ubigeo de la provincia termina en "00"
    return id_ubigeo.substring(2, 4);
  }

  // Método para mostrar modal de credenciales
  mostrarModalCredenciales(response: any): void {
    this.credencialesGeneradas = response.credenciales;
    this.showCredencialesModal = true;
  }

  // Cerrar modal y navegar
  cerrarModalCredenciales(): void {
    this.showCredencialesModal = false;
    this.credencialesGeneradas = null;
    this.router.navigate(['/dashboard/motorizados']);
  }

  // Copiar credenciales al portapapeles
  copiarCredenciales(): void {
    const texto = `Usuario: ${this.credencialesGeneradas.username}\nContraseña: ${this.credencialesGeneradas.password}`;
    navigator.clipboard.writeText(texto).then(() => {
      this.toastr.success('Credenciales copiadas al portapapeles');
    }).catch(() => {
      this.toastr.error('Error al copiar al portapapeles');
    });
  }
}