import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { UsuariosService, UsuarioErp } from '../../../services/usuarios.service';
import Swal from 'sweetalert2'; // ← AGREGAR ESTA LÍNEA
import { environment } from '../../../../environments/environment';

/** Pestañas del modal. "Avanzado" es la vinculación con Novik. */
type TabUsuario = 'informacion' | 'avanzado';

/** Pasos del asistente de vinculación, igual que en el modal de clientes. */
type PasoVinculacion = 'busqueda' | 'confirmar' | 'exito';

@Component({
  selector: 'app-usuario-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './usuario-modal.component.html',
  styleUrl: './usuario-modal.component.scss'
})
export class UsuarioModalComponent {
@Input() usuarioId: number | null = null;
  @Input() isVisible: boolean = false;
  @Input() mode: 'view' | 'edit' = 'view';
  @Output() closeModal = new EventEmitter<void>();
  @Output() usuarioActualizado = new EventEmitter<void>();

  usuarioForm: FormGroup;
  loading = false;
  tiposDocumento: any[] = [];
  roles: any[] = [];
  departamentos: any[] = [];
  provincias: any[] = [];
  distritos: any[] = [];
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  removeAvatar = false;
  // Agregar después de las propiedades existentes:
  addressUbigeoData: { [key: number]: { provinces: any[], districts: any[] } } = {};

  // ── Pestaña Avanzado: vinculación con Novik ───────────────────────────
  tab: TabUsuario = 'informacion';

  usuarioErpVinculado: UsuarioErp | null = null;
  cargandoVinculado = false;
  mostrarMenuVinculacion = false;

  /** Asistente de vinculación (tapa el formulario mientras está abierto). */
  mostrandoBusqueda = false;
  pasoVinculacion: PasoVinculacion = 'busqueda';

  busquedaQuery = '';
  buscandoErp = false;
  cargandoMas = false;
  hayMasResultados = false;
  resultadosBusqueda: UsuarioErp[] = [];
  soloVendedores = true;
  private busqueda$ = new Subject<string>();

  usuarioErpSeleccionado: UsuarioErp | null = null;
  mostrarCampoPassword = false;
  passwordVinculacion = '';
  vinculando = false;
  errorVinculacion = '';

  mostrandoEliminarVinculacion = false;
  passwordEliminarVinculacion = '';
  eliminandoVinculacion = false;
  errorEliminarVinculacion = '';

  constructor(
    private fb: FormBuilder,
    private usuariosService: UsuariosService
  ) {
    this.usuarioForm = this.createForm();
  }

  ngOnInit() {
    this.cargarDatosIniciales();

    // La búsqueda en Novik espera a que el admin deje de escribir.
    this.busqueda$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.buscarEnErp(true));

    if (this.usuarioId && this.isVisible) {
      this.cargarUsuario();
    }
  }

  ngOnChanges() {
  if (this.usuarioId && this.isVisible) {
    // ← AGREGAR ESTA LÍNEA para limpiar datos previos:
    this.limpiarDatosPrevios();
    this.cargarUsuario();
    this.cargarVinculacion();
  }
}

// ← AGREGAR ESTE MÉTODO NUEVO:
private limpiarDatosPrevios() {
  // Limpiar datos de ubigeo previos
  this.addressUbigeoData = {};
  this.provincias = [];
  this.distritos = [];
  
  // Resetear el formulario
  this.usuarioForm.reset();
  this.addressesArray.clear();
  
  // Limpiar preview de avatar
  this.previewUrl = null;
  this.selectedFile = null;
  this.removeAvatar = false;
  
  console.log('Datos previos limpiados');
}

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role_id: ['', Validators.required],
      profile: this.fb.group({
        first_name: ['', Validators.required],
        last_name_father: [''],
        last_name_mother: [''],
        phone: [''],
        document_type: ['', Validators.required],
        document_number: ['', Validators.required],
        birth_date: ['', Validators.required],
        genero: ['', Validators.required],
        avatar_url: ['']
      }),
      addresses: this.fb.array([])
    });
  }

  get addressesArray(): FormArray {
    return this.usuarioForm.get('addresses') as FormArray;
  }

cargarDatosIniciales() {
  // Cargar tipos de documento
  this.usuariosService.obtenerTiposDocumento().subscribe(tipos => {
    this.tiposDocumento = tipos;
    console.log('Tipos de documento cargados:', tipos); // Debug
  });

  // Cargar roles
  this.usuariosService.obtenerRoles().subscribe(roles => {
    this.roles = roles;
    console.log('Roles cargados:', roles); // Debug
  });

  // Cargar departamentos
  this.usuariosService.obtenerDepartamentos().subscribe(departamentos => {
    this.departamentos = departamentos;
    console.log('Departamentos cargados:', departamentos); // Debug
  });
}

cargarUsuario() {
  if (!this.usuarioId) return;
  
  this.loading = true;
  
  // Primero cargar datos de selects, luego el usuario
  Promise.all([
    this.usuariosService.obtenerTiposDocumento().toPromise(),
    this.usuariosService.obtenerRoles().toPromise(),
    this.usuariosService.obtenerDepartamentos().toPromise()
  ]).then(([tipos, roles, departamentos]) => {
    this.tiposDocumento = tipos || [];
    this.roles = roles || [];
    this.departamentos = departamentos || [];
    
    console.log('Tipos de documento cargados:', this.tiposDocumento);

    // Ahora cargar el usuario
    this.usuariosService.obtenerUsuario(this.usuarioId!).subscribe({
      next: (usuario) => {
        console.log('Usuario cargado:', usuario); // Debug
        
        // Formatear fecha
        let birthDate = '';
        if (usuario.profile?.birth_date) {
          const date = new Date(usuario.profile.birth_date);
          birthDate = date.toISOString().split('T')[0];
        }
        
       // ← ACTUALIZADO: Usamos role_id del usuario transformado
      this.usuarioForm.patchValue({
        name: usuario.name,
        email: usuario.email,
        role_id: usuario.role_id, // ← ahora viene correctamente del backend
        profile: {
          first_name: usuario.profile?.first_name || '',
          last_name_father: usuario.profile?.last_name_father || '',
          last_name_mother: usuario.profile?.last_name_mother || '',
          phone: usuario.profile?.phone || '',
          document_type: usuario.profile?.document_type?.id || '',
          document_number: usuario.profile?.document_number || '',
          birth_date: birthDate,
          genero: usuario.profile?.genero || '',
          avatar_url: usuario.profile?.avatar_url || ''
        }
      });

        // Agregar este log para verificar
        console.log('Tipo de documento establecido:', usuario.profile?.document_type?.id);
        
        // Cargar direcciones y ubicaciones
        this.cargarDirecciones(usuario.addresses || []);
        
       // Establecer preview del avatar
        if (usuario.profile?.avatar_url) {
          // this.previewUrl = 'http://localhost:8000' + usuario.profile.avatar_url;
          this.previewUrl = `${environment.baseUrl}${usuario.profile.avatar_url}`
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar usuario:', error); // Mantener para depuración
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar la información del usuario',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
        this.loading = false;
      }
    });
  });
}

  agregarDireccion(direccion?: any) {
    const direccionForm = this.fb.group({
      id: [direccion?.id || null],
      label: [direccion?.label || '', Validators.required],
      address_line: [direccion?.address_line || ''], // ← Agregar esta línea
      department: [direccion?.department || '', Validators.required],
      province: [direccion?.province || '', Validators.required],
      city: [direccion?.city || '', Validators.required],
      postal_code: [direccion?.postal_code || ''],
      country: ['Perú'],
      is_default: [direccion?.is_default || false]
    });

    this.addressesArray.push(direccionForm);
  }

  eliminarDireccion(index: number) {
    if (this.addressesArray.length > 1) {
      this.addressesArray.removeAt(index);
    }
  }

onDepartamentoChange(event: any, addressIndex: number) {
  const departamentoIdUbigeo = event.target.value;
  console.log(`Departamento seleccionado (id_ubigeo): ${departamentoIdUbigeo}`);
  
  // Inicializar datos para esta dirección si no existen
  if (!this.addressUbigeoData[addressIndex]) {
    this.addressUbigeoData[addressIndex] = { provinces: [], districts: [] };
  }
  
  // Resetear provincias y distritos
  this.addressUbigeoData[addressIndex].provinces = [];
  this.addressUbigeoData[addressIndex].districts = [];
  
  // Resetear valores en el formulario
  const addressControl = this.addressesArray.at(addressIndex);
  addressControl.get('province')?.setValue('');
  addressControl.get('city')?.setValue('');
  
  if (departamentoIdUbigeo) {
    // Encontrar el departamento seleccionado
    const selectedDepartment = this.departamentos.find(d => d.id_ubigeo == departamentoIdUbigeo);
    console.log('Departamento encontrado:', selectedDepartment);
    
    if (selectedDepartment) {
      console.log(`Cargando provincias para departamento código: ${selectedDepartment.id}`);
      
      this.usuariosService.obtenerProvincias(selectedDepartment.id).subscribe({
        next: (provincias: any[]) => {
          console.log(`Provincias cargadas: ${provincias.length}`, provincias);
          this.addressUbigeoData[addressIndex].provinces = provincias;
        },
        error: (error: any) => {
          console.error('Error cargando provincias:', error);
        }
      });
    } else {
      console.error('No se encontró el departamento con id_ubigeo:', departamentoIdUbigeo);
    }
  }
}

onProvinciaChange(event: any, addressIndex: number) {
  const provinciaIdUbigeo = event.target.value;
  console.log(`Provincia seleccionada (id_ubigeo): ${provinciaIdUbigeo}`);
  
  // Inicializar datos para esta dirección si no existen
  if (!this.addressUbigeoData[addressIndex]) {
    this.addressUbigeoData[addressIndex] = { provinces: [], districts: [] };
  }
  
  // Resetear distritos
  this.addressUbigeoData[addressIndex].districts = [];
  this.addressesArray.at(addressIndex).get('city')?.setValue('');
  
  if (provinciaIdUbigeo) {
    // Obtener los códigos necesarios
    const departamentoIdUbigeo = this.addressesArray.at(addressIndex).get('department')?.value;
    const selectedDepartment = this.departamentos.find(d => d.id_ubigeo == departamentoIdUbigeo);
    const selectedProvince = this.addressUbigeoData[addressIndex].provinces.find(p => p.id_ubigeo == provinciaIdUbigeo);
    
    console.log('Departamento para distritos:', selectedDepartment);
    console.log('Provincia para distritos:', selectedProvince);
    
    if (selectedDepartment && selectedProvince) {
      console.log(`Cargando distritos para departamento: ${selectedDepartment.id}, provincia: ${selectedProvince.id}`);
      
      this.usuariosService.obtenerDistritos(selectedDepartment.id, selectedProvince.id).subscribe({
        next: (distritos: any[]) => {
          console.log(`Distritos cargados: ${distritos.length}`, distritos);
          this.addressUbigeoData[addressIndex].districts = distritos;
        },
        error: (error: any) => {
          console.error('Error cargando distritos:', error);
        }
      });
    } else {
      console.error('No se encontraron departamento o provincia para cargar distritos');
    }
  }
}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.removeAvatar = false;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onRemoveAvatar() {
    this.removeAvatar = true;
    this.selectedFile = null;
    this.previewUrl = null;
  }

  marcarComoPrincipal(index: number) {
    // Desmarcar todas las direcciones
    this.addressesArray.controls.forEach(control => {
      control.patchValue({ is_default: false });
    });
    // Marcar la seleccionada como principal
    this.addressesArray.at(index).patchValue({ is_default: true });
  }

 debugFormulario() {
  console.log('=== DEBUG FORMULARIO ===');
  console.log('Form valid:', this.usuarioForm.valid);
  console.log('Form errors:', this.getFormErrors());
  console.log('Form values:', this.usuarioForm.value);
  console.log('Addresses array length:', this.addressesArray.length);
  console.log('Selected file:', this.selectedFile);
  console.log('Remove avatar:', this.removeAvatar);
}

// Agrega también esta función helper
getFormErrors() {
  const errors: any = {};
  Object.keys(this.usuarioForm.controls).forEach(key => {
    const control = this.usuarioForm.get(key);
    if (control && !control.valid && control.touched) {
      errors[key] = control.errors;
    }
  });
  return errors;
}

onSubmit() {
  // AGREGAR ESTA LÍNEA AL INICIO
  this.debugFormulario();
    
  if (this.usuarioForm.valid && this.mode === 'edit') {
    this.loading = true;
    
    if (this.selectedFile || this.removeAvatar) {
      const formData = new FormData();
      
      // Datos básicos del usuario
      const formValues = this.usuarioForm.value;
      formData.append('name', formValues.name || '');
      formData.append('email', formValues.email || '');
      // Asegurar que role_id se envíe como número (no como string)
      const roleId = parseInt(formValues.role_id);
      if (!isNaN(roleId)) {
        formData.append('role_id', roleId.toString());
      }
      
      // Debug: Verificar valores del formulario
      console.log('Valores del formulario:', formValues);
      
      // Datos del perfil - TRANSFORMACIÓN MEJORADA
      if (formValues.profile) {
        Object.keys(formValues.profile).forEach(key => {
          const value = formValues.profile[key];
          if (value !== null && value !== '' && key !== 'avatar_url') {
            formData.append(`profile[${key}]`, value.toString());
            console.log(`Agregando profile[${key}]:`, value);
          }
        });
      }
      
      // Direcciones - TRANSFORMACIÓN MEJORADA 
      if (formValues.addresses && Array.isArray(formValues.addresses)) {
        formValues.addresses.forEach((address: any, index: number) => {
          Object.keys(address).forEach(key => {
            const value = address[key];
            if (value !== null && value !== '' && value !== undefined) {
              // CAMBIO CLAVE: Convertir boolean a string para Laravel
              const stringValue = typeof value === 'boolean' ? (value ? '1' : '0') : value.toString();
              formData.append(`addresses[${index}][${key}]`, stringValue);
              console.log(`Agregando addresses[${index}][${key}]:`, stringValue);
            }
          });
        });
      }
      
      // Agregar archivo de avatar si existe
      if (this.selectedFile) {
        formData.append('avatar', this.selectedFile);
        console.log('Avatar agregado:', this.selectedFile.name);
      }
      
      // Agregar flag para eliminar avatar
      if (this.removeAvatar) {
        formData.append('remove_avatar', 'true');
        console.log('Flag remove_avatar agregado');
      }
      
      // Debug: Mostrar todo lo que se está enviando
      console.log('=== CONTENIDO DEL FORMDATA ===');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }
      
      // AGREGADO: Añadir _method para Laravel
      formData.append('_method', 'PUT');
      
      // Enviar con FormData
      this.usuariosService.actualizarUsuario(this.usuarioId!, formData).subscribe({
        next: (response) => {
          this.loading = false;
          Swal.fire({
            title: '¡Éxito!',
            text: 'Usuario actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.usuarioActualizado.emit();
          this.cerrarModal();
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el usuario. Inténtalo nuevamente.',
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
          this.loading = false;
        }
      });
      
    } else {
      // Si no hay archivo, enviar como JSON normal
      const userData = {
        name: this.usuarioForm.get('name')?.value,
        email: this.usuarioForm.get('email')?.value,
        role_id: parseInt(this.usuarioForm.get('role_id')?.value) || null,
        profile: this.usuarioForm.get('profile')?.value,
        addresses: this.addressesArray.value
      };
      
      this.usuariosService.actualizarUsuarioSinArchivo(this.usuarioId!, userData).subscribe({
        next: (response) => {
          this.loading = false;
          Swal.fire({
            title: '¡Éxito!',
            text: 'Usuario actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.usuarioActualizado.emit();
          this.cerrarModal();
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el usuario. Inténtalo nuevamente.',
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
          this.loading = false;
        }
      });
    }
  }
}

  cerrarModal() {
    this.closeModal.emit();
    this.usuarioForm.reset();
    this.selectedFile = null;
    this.previewUrl = null;
    this.removeAvatar = false;
    this.tab = 'informacion';
    this.cerrarBusqueda();
    this.cancelarEliminarVinculacion();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Pestaña Avanzado: vinculación con un usuario de Novik
  // ══════════════════════════════════════════════════════════════════════

  /** Trae el usuario de Novik al que está vinculada la cuenta, si tiene. */
  cargarVinculacion() {
    if (!this.usuarioId) return;

    this.cargandoVinculado = true;
    this.usuariosService.obtenerVinculacion(this.usuarioId).subscribe({
      next: res => {
        this.usuarioErpVinculado = res.usuario ?? null;
        this.cargandoVinculado = false;
      },
      error: () => {
        this.usuarioErpVinculado = null;
        this.cargandoVinculado = false;
      },
    });
  }

  toggleMenuVinculacion(evento: Event) {
    evento.stopPropagation();
    this.mostrarMenuVinculacion = !this.mostrarMenuVinculacion;
  }

  abrirBusqueda() {
    this.mostrandoBusqueda = true;
    this.pasoVinculacion = 'busqueda';
    this.busquedaQuery = '';
    this.resultadosBusqueda = [];
    this.usuarioErpSeleccionado = null;
    this.mostrarCampoPassword = false;
    this.passwordVinculacion = '';
    this.errorVinculacion = '';
    this.buscarEnErp(true);
  }

  cerrarBusqueda() {
    this.mostrandoBusqueda = false;
    this.pasoVinculacion = 'busqueda';
    this.usuarioErpSeleccionado = null;
    this.mostrarCampoPassword = false;
    this.passwordVinculacion = '';
    this.errorVinculacion = '';
  }

  onBusquedaChange(valor: string) {
    this.busqueda$.next(valor);
  }

  /** Alterna entre "solo Vendedores" y todos los usuarios del ERP. */
  cambiarFiltroVendedores(soloVendedores: boolean) {
    this.soloVendedores = soloVendedores;
    this.buscarEnErp(true);
  }

  private buscarEnErp(reiniciar: boolean) {
    if (!this.mostrandoBusqueda) return;

    const offset = reiniciar ? 0 : this.resultadosBusqueda.length;
    if (reiniciar) this.buscandoErp = true;
    else this.cargandoMas = true;

    this.usuariosService
      .buscarUsuariosErp(this.busquedaQuery, offset, this.soloVendedores)
      .subscribe({
        next: res => {
          this.resultadosBusqueda = reiniciar
            ? res.usuarios
            : [...this.resultadosBusqueda, ...res.usuarios];
          this.hayMasResultados = res.hay_mas;
          this.buscandoErp = false;
          this.cargandoMas = false;
        },
        error: () => {
          if (reiniciar) this.resultadosBusqueda = [];
          this.hayMasResultados = false;
          this.buscandoErp = false;
          this.cargandoMas = false;
        },
      });
  }

  /** Scroll infinito del listado de resultados. */
  onScrollResultados(evento: Event) {
    const el = evento.target as HTMLElement;
    const alFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (alFinal && this.hayMasResultados && !this.cargandoMas && !this.buscandoErp) {
      this.buscarEnErp(false);
    }
  }

  seleccionarUsuarioErp(usuario: UsuarioErp) {
    this.usuarioErpSeleccionado = usuario;
    this.pasoVinculacion = 'confirmar';
    this.mostrarCampoPassword = false;
    this.passwordVinculacion = '';
    this.errorVinculacion = '';
  }

  pedirPassword() {
    this.mostrarCampoPassword = true;
  }

  ejecutarVinculacion() {
    if (!this.usuarioId || !this.usuarioErpSeleccionado || !this.passwordVinculacion) return;

    this.vinculando = true;
    this.errorVinculacion = '';

    this.usuariosService
      .vincular(this.usuarioId, this.usuarioErpSeleccionado.codigo, this.passwordVinculacion)
      .subscribe({
        next: res => {
          this.vinculando = false;
          this.usuarioErpVinculado = res.usuario;
          this.pasoVinculacion = 'exito';
        },
        error: err => {
          this.vinculando = false;
          this.errorVinculacion =
            err?.error?.message || 'No se pudo realizar la vinculación. Intenta nuevamente.';
        },
      });
  }

  finalizarVinculacion() {
    this.cerrarBusqueda();
    this.mostrarMenuVinculacion = false;
    this.usuarioActualizado.emit();
  }

  abrirEliminarVinculacion() {
    this.mostrarMenuVinculacion = false;
    this.mostrandoEliminarVinculacion = true;
    this.passwordEliminarVinculacion = '';
    this.errorEliminarVinculacion = '';
  }

  cancelarEliminarVinculacion() {
    this.mostrandoEliminarVinculacion = false;
    this.passwordEliminarVinculacion = '';
    this.errorEliminarVinculacion = '';
  }

  confirmarEliminarVinculacion() {
    if (!this.usuarioId || !this.passwordEliminarVinculacion) return;

    this.eliminandoVinculacion = true;
    this.errorEliminarVinculacion = '';

    this.usuariosService.desvincular(this.usuarioId, this.passwordEliminarVinculacion).subscribe({
      next: () => {
        this.eliminandoVinculacion = false;
        this.usuarioErpVinculado = null;
        this.cancelarEliminarVinculacion();
        this.usuarioActualizado.emit();
      },
      error: err => {
        this.eliminandoVinculacion = false;
        this.errorEliminarVinculacion =
          err?.error?.message || 'No se pudo quitar la vinculación.';
      },
    });
  }

  getInitials(name: string): string {
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  getAvatarColor(name: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  }

cargarDirecciones(addresses: any[]) {
  this.addressesArray.clear();
  
  if (addresses && addresses.length > 0) {
    addresses.forEach((address: any, index: number) => {
      // Agregar la dirección al formulario
      this.agregarDireccion(address);
      
      // Inicializar datos para esta dirección si no existen
      if (!this.addressUbigeoData[index]) {
        this.addressUbigeoData[index] = { provinces: [], districts: [] };
      }
      
      console.log(`Cargando dirección ${index}:`, address);
      
      // ← NUEVA LÓGICA: Cargar ubicaciones de forma secuencial
      this.cargarUbicacionesParaDireccion(address, index);
    });
  } else {
    this.agregarDireccion();
  }
}

// ← AGREGAR ESTE MÉTODO NUEVO:
private cargarUbicacionesParaDireccion(address: any, index: number) {
  if (!address.department) return;
  
  // Encontrar el departamento por id_ubigeo
  const selectedDepartment = this.departamentos.find(d => d.id_ubigeo == address.department);
  console.log(`Departamento encontrado para dirección ${index}:`, selectedDepartment);
  
  if (selectedDepartment) {
    // Cargar provincias
    this.usuariosService.obtenerProvincias(selectedDepartment.id).subscribe({
      next: (provincias) => {
        console.log(`Provincias cargadas para dirección ${index}:`, provincias);
        this.addressUbigeoData[index].provinces = provincias;
        
        // Si hay provincia seleccionada, cargar distritos
        if (address.province) {
          const selectedProvince = provincias.find(p => p.id_ubigeo == address.province);
          console.log(`Provincia encontrada para dirección ${index}:`, selectedProvince);
          
          if (selectedProvince) {
            this.usuariosService.obtenerDistritos(selectedDepartment.id, selectedProvince.id).subscribe({
              next: (distritos) => {
                console.log(`Distritos cargados para dirección ${index}:`, distritos);
                this.addressUbigeoData[index].districts = distritos;
              },
              error: (error) => {
                console.error(`Error cargando distritos para dirección ${index}:`, error);
              }
            });
          }
        }
      },
      error: (error) => {
        console.error(`Error cargando provincias para dirección ${index}:`, error);
      }
    });
  }
}

// Agregar estos métodos auxiliares para extraer los códigos de departamento y provincia
private getDepartmentCode(id_ubigeo: string): number {
  // El id_ubigeo guardado es el id de la tabla, necesitamos extraer el código de departamento
  const departamento = this.departamentos.find(d => d.id_ubigeo == id_ubigeo);
  return departamento ? parseInt(departamento.id) : 0;
}

private getProvinceCode(id_ubigeo: string): number {
  // Extraer el código de provincia del id_ubigeo
  const provincia = this.provincias.find(p => p.id_ubigeo == id_ubigeo);
  return provincia ? parseInt(provincia.id) : 0;
}

  cargarProvinciasParaDireccion(departmentId: string, addressIndex: number, selectedProvince?: string, selectedDistrict?: string) {
    const selectedDepartment = this.departamentos.find(d => d.id_ubigeo == departmentId);
    
    if (selectedDepartment) {
      this.usuariosService.obtenerProvincias(selectedDepartment.id).subscribe(provincias => {
        // Guardar provincias para esta dirección específica
        if (!this.addressUbigeoData[addressIndex]) {
          this.addressUbigeoData[addressIndex] = { provinces: [], districts: [] };
        }
        this.addressUbigeoData[addressIndex].provinces = provincias;
        
        // Si hay provincia seleccionada, cargar distritos
        if (selectedProvince) {
          const selectedProv = provincias.find(p => p.id_ubigeo == selectedProvince);
          if (selectedProv) {
            this.usuariosService.obtenerDistritos(selectedDepartment.id, selectedProv.id).subscribe(distritos => {
              this.addressUbigeoData[addressIndex].districts = distritos;
            });
          }
        }
      });
    }
  }

  // Agregar estos métodos:
  getProvincesForAddress(addressIndex: number): any[] {
    return this.addressUbigeoData[addressIndex]?.provinces || [];
  }

  getDistrictsForAddress(addressIndex: number): any[] {
    return this.addressUbigeoData[addressIndex]?.districts || [];
  }

}
