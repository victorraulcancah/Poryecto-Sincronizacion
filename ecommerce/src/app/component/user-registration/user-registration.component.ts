import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
// Agregar después de las importaciones existentes
import { RegistrationService, Role, DocumentType, UbigeoItem } from '../../services/registration.service';
import { HttpClient } from '@angular/common/http';
import { ReniecService, ReniecResponse } from '../../services/reniec.service'; // コード ← este es el bueno
import Swal from 'sweetalert2';


interface Address {
  label: string;
  district: string;
  city: string;
  province: string;
  department: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}




@Component({
  selector: 'app-user-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-registration.component.html',
  styleUrl: './user-registration.component.scss'
})
export class UserRegistrationComponent {
userForm!: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  roles: Role[] = [];

  documentTypes: DocumentType[] = [];

  genders = [
    { id: 'M', name: 'Masculino' },
    { id: 'F', name: 'Femenino' },
  ];

  // Agregar después de las propiedades existentes (línea ~45 aprox)
  isSearchingReniec: boolean = false;

  // Reemplazar por:
  addressUbigeoData: { [key: number]: { provinces: UbigeoItem[], districts: UbigeoItem[] } } = {};

  departments: UbigeoItem[] = [];

  countries = [
    { id: 1, name: 'Perú' },
    { id: 2, name: 'Colombia' },
    { id: 3, name: 'Ecuador' },
    { id: 4, name: 'Chile' },
    { id: 5, name: 'Argentina' }
  ];

// REEMPLAZA el constructor existente con:
constructor(
  private fb: FormBuilder, 
  private router: Router,
  private registrationService: RegistrationService,
  private reniecService: ReniecService
) {}

 // REEMPLAZA el método ngOnInit existente con:
ngOnInit(): void {
  console.log('=== DEBUG ngOnInit ===');
  console.log('RegistrationService disponible:', !!this.registrationService);
  
  this.initializeForm();
  this.loadInitialData();
}

  initializeForm(): void {
    this.userForm = this.fb.group({
      // Datos base (users)
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      role: ['', [Validators.required]],

      // Datos del perfil (user_profiles)
      first_name: ['', [Validators.required]],
      apellido_paterno: ['', [Validators.required]],
      apellido_materno: [''],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      document_type: ['', [Validators.required]],
      document_number: ['', [Validators.required]],
      birth_date: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      avatar_url: [''],

      // Direcciones (user_addresses)
      addresses: this.fb.array([this.createAddressGroup()])
    });

    // Validador personalizado para confirmar contraseña
    this.userForm.get('confirmPassword')?.setValidators([
      Validators.required,
      this.passwordMatchValidator.bind(this)
    ]);
  }

  passwordMatchValidator(control: any) {
    const password = this.userForm?.get('password')?.value;
    const confirmPassword = control.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  createAddressGroup(): FormGroup {
    return this.fb.group({
      label: ['Casa', [Validators.required]],
      detalle_direccion: ['', [Validators.required]],
      district: ['', [Validators.required]], 
      province: ['', [Validators.required]],
      department: ['', [Validators.required]],
      postal_code: [''],
      country: ['', [Validators.required]],
      is_default: [false]
    });
  }

  get addresses(): FormArray {
    return this.userForm.get('addresses') as FormArray;
  }

  addAddress(): void {
    this.addresses.push(this.createAddressGroup());
  }

  removeAddress(index: number): void {
    if (this.addresses.length > 1) {
      this.addresses.removeAt(index);
    }
  }

  getProvincesForAddress(addressIndex: number): UbigeoItem[] {
    return this.addressUbigeoData[addressIndex]?.provinces || [];
  }

  getDistrictsForAddress(addressIndex: number): UbigeoItem[] {
    return this.addressUbigeoData[addressIndex]?.districts || [];
  }

  onDefaultAddressChange(selectedIndex: number): void {
    // Solo una dirección puede ser la principal
    this.addresses.controls.forEach((control, index) => {
      if (index === selectedIndex) {
        control.get('is_default')?.setValue(true);
      } else {
        control.get('is_default')?.setValue(false);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    const fileInput = document.getElementById('avatar') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

 onSubmit(): void {
  console.log('=== DEBUG onSubmit ===');
  console.log('Form valid:', this.userForm.valid);
  console.log('Form errors:', this.getFormErrors());
  
  if (this.userForm.valid) {
    const formData = this.userForm.value;
    
    console.log('Datos del formulario:', formData);
    console.log('Archivo seleccionado:', this.selectedFile);
    
    this.submitUserData(formData);
  } else {
    console.log('Formulario INVÁLIDO - marcando campos como tocados');
    this.markFormGroupTouched(this.userForm);
  }
}



 private submitUserData(formData: any): void {
  // Convertir IDs de país a nombres de país en las direcciones
  const processedAddresses = formData.addresses.map((address: any) => {
    const countryName = this.countries.find(c => c.id == address.country)?.name || '';
    return {
      ...address,
      country: countryName // Enviar el nombre del país en lugar del ID
    };
  });

  // Preparar datos para envío
  const userData = {
    name: formData.name,
    email: formData.email,
    password: formData.password,
    role: formData.role,
    first_name: formData.first_name,
    apellido_paterno: formData.apellido_paterno,
    apellido_materno: formData.apellido_materno,
    phone: formData.phone,
    document_type: formData.document_type,
    document_number: formData.document_number,
    birth_date: formData.birth_date,
    gender: formData.gender,
    addresses: processedAddresses // Usar las direcciones procesadas
  };

  console.log('addresses antes de enviar:', formData.addresses);

  this.registrationService.registerUser(userData, this.selectedFile ?? undefined).subscribe({
    next: (response: any) => {
      console.log('Usuario registrado exitosamente:', response);
      // Redirigir a la lista de usuarios o mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: response.message || 'Usuario registrado correctamente',
        confirmButtonText: 'OK'
      });
      this.router.navigate(['/dashboard/usuarios']);
    },
    error: (error: any) => {
      console.error('Error al registrar usuario:', error);
      // Manejar errores aquí
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.error?.message || 'Ocurrió un error al registrar el usuario',
        confirmButtonText: 'OK'
      });
    }
  });
}

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  // Métodos auxiliares para validación
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isAddressFieldInvalid(index: number, fieldName: string): boolean {
    const field = this.addresses.at(index).get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }

  // ← AGREGAR ESTE MÉTODO NUEVO:
  getAddressFieldError(index: number, fieldName: string): string {
    const field = this.addresses.at(index).get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return 'Formato inválido';
    }
    return '';
  }

  // Función para debug - eliminar en producción
  private getFormErrors(): any {
    let formErrors: any = {};
    
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control && !control.valid) {
        formErrors[key] = control.errors;
      }
    });
    
    // Revisar errores en addresses
    const addressesControl = this.userForm.get('addresses') as FormArray;
    if (addressesControl) {
      addressesControl.controls.forEach((addressControl, index) => {
        Object.keys(addressControl.value).forEach(fieldKey => {
          const field = addressControl.get(fieldKey);
          if (field && !field.valid) {
            if (!formErrors[`address_${index}`]) {
              formErrors[`address_${index}`] = {};
            }
            formErrors[`address_${index}`][fieldKey] = field.errors;
          }
        });
      });
    }
    
    return formErrors;
  }

  irListaUsuarios() {
    this.router.navigate(['/dashboard/usuarios']);
  }

  // AGREGAR estos métodos nuevos:
  private loadInitialData(): void {
    this.loadRoles();
    this.loadDocumentTypes();
    this.loadDepartments();
  }

  private loadRoles(): void {
    this.registrationService.getRoles().subscribe({
      next: (roles: Role[]) => {
        this.roles = roles;
      },
      error: (error: any) => {
        console.error('Error cargando roles:', error);
      }
    });
  }

  private loadDocumentTypes(): void {
    this.registrationService.getDocumentTypes().subscribe({
      next: (documentTypes: DocumentType[]) => {
        // Aquí debes asignar los tipos de documento a alguna variable de tu componente
        this.documentTypes = documentTypes;
      },
      error: (error: any) => {
        console.error('Error cargando tipos de documento:', error);
      }
    });
  }

  private loadDepartments(): void {
  this.registrationService.getDepartamentos().subscribe({
    next: (departments: UbigeoItem[]) => {
      // El controlador ya retorna 'id_ubigeo as id', así que no necesitamos mapear
      this.departments = departments;
    },
    error: (error: any) => {
      console.error('Error cargando departamentos:', error);
    }
  });
}

// Busca onDepartmentChange y reemplázala completamente:
onDepartmentChange(event: any, addressIndex: number): void {
  const departmentIdUbigeo = event.target.value; // ← Ahora es id_ubigeo
  
  // Inicializar datos para esta dirección si no existen
  if (!this.addressUbigeoData[addressIndex]) {
    this.addressUbigeoData[addressIndex] = { provinces: [], districts: [] };
  }
  
  // Resetear provincias y distritos para esta dirección específica
  this.addressUbigeoData[addressIndex].provinces = [];
  this.addressUbigeoData[addressIndex].districts = [];
  
  // Resetear los valores en el formulario
  const addressControl = this.addresses.at(addressIndex);
  addressControl.get('province')?.setValue('');
  addressControl.get('district')?.setValue('');
  
  if (departmentIdUbigeo) {
    // Encontrar el código de departamento basado en el id_ubigeo seleccionado
    const selectedDepartment = this.departments.find(d => d.id_ubigeo == departmentIdUbigeo);
    if (selectedDepartment) {
      this.registrationService.getProvincias(selectedDepartment.id).subscribe({ // ← Usar el código, no id_ubigeo
        next: (provinces: UbigeoItem[]) => {
          this.addressUbigeoData[addressIndex].provinces = provinces;
        },
        error: (error: any) => {
          console.error('Error cargando provincias:', error);
        }
      });
    }
  }
}

// Busca onProvinceChange y reemplázala completamente:
onProvinceChange(event: any, addressIndex: number): void {
  const provinceIdUbigeo = event.target.value; // ← Ahora es id_ubigeo
  const addressControl = this.addresses.at(addressIndex);
  
  // Inicializar datos para esta dirección si no existen
  if (!this.addressUbigeoData[addressIndex]) {
    this.addressUbigeoData[addressIndex] = { provinces: [], districts: [] };
  }
  
  // Resetear distritos para esta dirección específica
  this.addressUbigeoData[addressIndex].districts = [];
  addressControl.get('district')?.setValue('');
  
  if (provinceIdUbigeo) {
    // Encontrar los códigos basados en los id_ubigeo seleccionados
    const departmentIdUbigeo = addressControl.get('department')?.value;
    const selectedDepartment = this.departments.find(d => d.id_ubigeo == departmentIdUbigeo);
    const selectedProvince = this.addressUbigeoData[addressIndex].provinces.find(p => p.id_ubigeo == provinceIdUbigeo);
    
    if (selectedDepartment && selectedProvince) {
      this.registrationService.getDistritos(selectedDepartment.id, selectedProvince.id).subscribe({ // ← Usar códigos
        next: (districts: UbigeoItem[]) => {
          this.addressUbigeoData[addressIndex].districts = districts;
        },
        error: (error: any) => {
          console.error('Error cargando distritos:', error);
        }
      });
    }
  }
}

buscarEnReniec(): void {
  const dni = this.userForm.get('document_number')?.value;
  
  if (!dni || dni.length !== 8) {
    Swal.fire({
      icon: 'warning',
      title: 'DNI Inválido',
      text: 'Por favor ingrese un DNI válido de 8 dígitos',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  this.isSearchingReniec = true;
  
      this.reniecService.buscarPorDni(dni).subscribe({ 
    next: (response: ReniecResponse) => {
      this.isSearchingReniec = false;
      
      if (response.success && response.nombres && response.apellidoPaterno && response.apellidoMaterno) { // コード

        this.userForm.patchValue({
          first_name: response.nombres || '',               // コード
          apellido_paterno: response.apellidoPaterno || '', // コード
          apellido_materno: response.apellidoMaterno || ''  // コード
        });

        Swal.fire({
          icon: 'success',
          title: '¡Datos encontrados!',
          text: `Datos de ${response.nombres} cargados correctamente`, // コード
          confirmButtonColor: '#28a745',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No encontrado',
          text: 'No se encontraron datos para este DNI',
          confirmButtonColor: '#dc3545'
        });
      }
    },
    error: (error) => {
      this.isSearchingReniec = false;
      console.error('Error buscando en RENIEC:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servicio de RENIEC. Intente nuevamente.',
        confirmButtonColor: '#dc3545'
      });
    }
  });
}

}
