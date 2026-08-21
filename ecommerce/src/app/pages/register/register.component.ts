// src/app/pages/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { AuthService } from '../../services/auth.service';
import { ReniecService } from '../../services/reniec.service';
import { CaptchaService } from '../../services/captcha.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  UbigeoService,
  Departamento,
  Provincia,
  Distrito,
} from '../../services/ubigeo.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbComponent,
    ShippingComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  registerError: string = '';
  registerSuccess: string = '';
  isLoading: boolean = false;
  showRegisterPassword: boolean = false;
  isDniLoading: boolean = false;
  dniStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  
  // Estados de validación
  emailStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  documentoStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  
  // Listas para ubigeo
  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];

  // Estados de carga
  isLoadingDepartamentos = false;
  isLoadingProvincias = false;
  isLoadingDistritos = false;

  // --- Propiedades para el Puzzle CAPTCHA ---
  puzzleSolved = false;
  puzzlePieces: any[] = [];
  puzzleBoard: (any | null)[] = [null, null, null, null];
  selectedPuzzleImage = '';

  /** Token del desafío; se manda al registrarse como prueba de que se resolvió. */
  puzzleToken = '';
  cargandoPuzzle = false;
  verificandoPuzzle = false;
  puzzleMensaje = '';
  private draggedPiece: any = null;
  showPuzzle = false;
  puzzleError = false;
  

  // Tipos de documento. Lista de respaldo por si falla la llamada a
  // /document-types; los ids DEBEN coincidir con la tabla `document_types`
  // (antes decía 4 = RUC, pero el 4 es Cédula y el RUC es el 6).
  tiposDocumento: any[] = [
    { id: 1, nombre: 'DNI' },
    { id: 2, nombre: 'Pasaporte' },
    { id: 3, nombre: 'Carnet de Extranjería' },
    { id: 4, nombre: 'Cédula' },
    { id: 6, nombre: 'RUC' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private reniecService: ReniecService,
    private ubigeoService: UbigeoService,
    private captchaService: CaptchaService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.setupDniAutoComplete();
    this.setupEmailValidation();
    this.setupDocumentoValidation();
    this.setupUbigeoListeners();
    this.loadDocumentTypes();
    this.loadDepartamentos();

    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.setupPuzzle();
  }

  // --- Métodos para el Puzzle CAPTCHA ---

  /**
   * Las imágenes ya no viven en el código: las administra el panel
   * (dashboard/captcha) y el servidor manda una al azar entre las activas.
   */
  setupPuzzle(): void {
    this.puzzleSolved = false;
    this.puzzleBoard = [null, null, null, null];
    this.puzzlePieces = [];
    this.puzzleError = false;
    this.puzzleMensaje = '';
    this.cargandoPuzzle = true;

    this.captchaService.obtenerDesafio().subscribe({
      next: (desafio) => {
        this.puzzleToken = desafio.token;
        this.selectedPuzzleImage = this.captchaService.urlImagen(desafio.imagen);

        // El servidor manda el orden barajado; el navegador solo lo dibuja.
        // `style` es la pieza a tamaño del tablero (150px) y `styleMini` la de
        // la bandeja (84px): si se comparte una sola, la que se muestra chica
        // recorta el trozo equivocado de la imagen.
        this.puzzlePieces = desafio.piezas.map((id) => ({
          id,
          style: this.estiloDePieza(id, 150),
          styleMini: this.estiloDePieza(id, 84),
        }));

        this.cargandoPuzzle = false;
      },
      error: () => {
        this.cargandoPuzzle = false;
        this.puzzleMensaje =
          'No se pudo cargar el captcha. Recarga la página o inténtalo en un momento.';
      },
    });
  }

  shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  onDragStart(piece: any): void {
    this.draggedPiece = piece;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Necesario para permitir el drop
    const target = event.target as HTMLElement;
    if (target.classList.contains('puzzle-placeholder')) {
        target.classList.add('over');
    }
  }

  onDragLeave(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('over');
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    const target = event.target as HTMLElement;
    target.classList.remove('over');

    if (this.puzzleBoard[index] === null && this.draggedPiece) {
      // Mover la pieza del contenedor de piezas al tablero. Ya no se valida
      // aquí: la comprobación es al pulsar "Confirmar".
      this.puzzleBoard[index] = this.draggedPiece;
      this.puzzlePieces = this.puzzlePieces.filter(p => p.id !== this.draggedPiece.id);
      this.draggedPiece = null;
      this.puzzleError = false;
      this.puzzleMensaje = '';
    }
  }

  /**
   * Estilo de una pieza para un tamaño de casilla dado. La imagen completa se
   * escala al doble del lado (2×2 piezas) y se desplaza al cuadrante que toca.
   */
  private estiloDePieza(id: number, lado: number): Record<string, string> {
    return {
      'background-image': `url(${this.selectedPuzzleImage})`,
      'background-size': `${lado * 2}px ${lado * 2}px`,
      'background-position': `${(id % 2) * -lado}px ${Math.floor(id / 2) * -lado}px`,
      'background-repeat': 'no-repeat',
    };
  }

  /** Devuelve una pieza colocada a la bandeja, para poder corregir. */
  quitarPieza(index: number): void {
    const pieza = this.puzzleBoard[index];
    if (!pieza) return;

    this.puzzleBoard[index] = null;
    this.puzzlePieces = [...this.puzzlePieces, pieza];
    this.puzzleError = false;
    this.puzzleMensaje = '';
  }

  /** ¿Están los cuatro huecos ocupados? Habilita el botón de confirmar. */
  get puzzleCompleto(): boolean {
    return this.puzzleBoard.every(pieza => pieza !== null);
  }

  /**
   * Confirma el rompecabezas. El orden se comprueba en el servidor: el
   * navegador nunca supo cuál era el correcto.
   */
  confirmarPuzzle(): void {
    if (!this.puzzleCompleto || this.verificandoPuzzle) return;

    this.verificandoPuzzle = true;
    this.puzzleError = false;
    this.puzzleMensaje = '';

    const orden = this.puzzleBoard.map(pieza => pieza!.id);

    this.captchaService.verificar(this.puzzleToken, orden).subscribe({
      next: () => {
        this.verificandoPuzzle = false;
        this.puzzleSolved = true;
        setTimeout(() => (this.showPuzzle = false), 1200);
      },
      error: (error) => {
        this.verificandoPuzzle = false;
        this.puzzleError = true;

        // Si caducó no sirve reintentar con el mismo desafío: se pide otro.
        if (error?.error?.expirado) {
          this.puzzleMensaje = 'El captcha caducó. Te preparamos uno nuevo.';
          setTimeout(() => this.setupPuzzle(), 1500);
          return;
        }

        this.puzzleMensaje =
          error?.error?.message || 'Las piezas no están en el orden correcto.';
      },
    });
  }

  initForms(): void {
    this.registerForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.maxLength(255)]],
      apellidos: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email]],
      tipo_documento_id: ['', Validators.required],
      numero_documento: ['', [Validators.required, Validators.maxLength(20)]],
      telefono: ['', Validators.maxLength(20)],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],

      // Datos de dirección (opcionales). Mismos campos que el modal de
      // "Mis direcciones" y el del panel de administración.
      direccion_completa: [''],
      referencia: [''],
      departamento_id: [''],
      provincia_id: [''],
      distrito_id: [''],
      ubigeo: [''],
    });

    // Nueva lógica: escuchar cambios en tipo de documento para mostrar/ocultar puzzle
    this.registerForm.get('tipo_documento_id')?.valueChanges.subscribe(() => {
      const numeroDocumento = this.registerForm.get('numero_documento')?.value;
      const tipoDocumento = this.registerForm.get('tipo_documento_id')?.value;
      
      if (tipoDocumento && numeroDocumento && numeroDocumento.length >= 8) {
        this.showPuzzle = true;
        if (this.puzzlePieces.length === 0) {
          this.setupPuzzle();
        }
      } else {
        this.showPuzzle = false;
      }
    });
  }

  setupEmailValidation(): void {
    this.registerForm
      .get('email')
      ?.valueChanges.pipe(debounceTime(800), distinctUntilChanged())
      .subscribe((email) => {
        if (email && this.registerForm.get('email')?.valid) {
          this.checkEmailExists(email);
        } else {
          this.emailStatus = 'idle';
        }
      });
  }

  setupDocumentoValidation(): void {
  this.registerForm
    .get('numero_documento')
    ?.valueChanges.pipe(debounceTime(800), distinctUntilChanged())
    .subscribe((numeroDocumento) => {
      if (numeroDocumento && numeroDocumento.length >= 8) {
        this.checkDocumentoExists(numeroDocumento);
        // Nueva lógica: mostrar puzzle cuando hay tipo de documento y número válido
        const tipoDocumento = this.registerForm.get('tipo_documento_id')?.value;
        if (tipoDocumento && numeroDocumento.length >= 8) {
          this.showPuzzle = true;
          if (this.puzzlePieces.length === 0) {
            this.setupPuzzle();
          }
        }
      } else {
        this.documentoStatus = 'idle';
        this.showPuzzle = false; // Ocultar puzzle si el documento no es válido
      }
    });
}

  checkEmailExists(email: string): void {
    this.emailStatus = 'checking';
    this.authService.checkEmail(email).subscribe({
      next: (response) => {
        this.emailStatus = response.exists ? 'taken' : 'available';
        if (response.exists) {
          this.registerForm.get('email')?.setErrors({ emailTaken: true });
        }
      },
      error: (error) => {
        this.emailStatus = 'idle';
        console.error('Error verificando email:', error);
      },
    });
  }

  checkDocumentoExists(numeroDocumento: string): void {
    this.documentoStatus = 'checking';
    this.authService.checkDocumento(numeroDocumento).subscribe({
      next: (response) => {
        this.documentoStatus = response.exists ? 'taken' : 'available';
        if (response.exists) {
          this.registerForm.get('numero_documento')?.setErrors({ documentoTaken: true });
          // NUEVO: Limpiar campos autocompletados si el documento está duplicado
          this.registerForm.patchValue({
            nombres: '',
            apellidos: '',
          });
        }
      },
      error: (error) => {
        this.documentoStatus = 'idle';
        console.error('Error verificando documento:', error);
      },
    });
  }

  loadDepartamentos(): void {
    this.isLoadingDepartamentos = true;
    this.ubigeoService.getDepartamentos().subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
        this.isLoadingDepartamentos = false;
      },
      error: (error) => {
        console.error('Error cargando departamentos:', error);
        this.isLoadingDepartamentos = false;
      },
    });
  }

  setupUbigeoListeners(): void {
    // Escuchar cambios en departamento
    this.registerForm
      .get('departamento_id')
      ?.valueChanges.subscribe((departamentoId) => {
        if (departamentoId) {
          this.loadProvincias(departamentoId);
          this.registerForm.patchValue({
            provincia_id: '',
            distrito_id: '',
            ubigeo: '',
          });
          this.provincias = [];
          this.distritos = [];
        }
      });

    // Escuchar cambios en provincia
    this.registerForm
      .get('provincia_id')
      ?.valueChanges.subscribe((provinciaId) => {
        const departamentoId = this.registerForm.get('departamento_id')?.value;
        if (departamentoId && provinciaId) {
          this.loadDistritos(departamentoId, provinciaId);
          this.registerForm.patchValue({
            distrito_id: '',
            ubigeo: '',
          });
          this.distritos = [];
        }
      });

    // Escuchar cambios en distrito para establecer ubigeo final
    this.registerForm
      .get('distrito_id')
      ?.valueChanges.subscribe((distritoId) => {
        if (distritoId) {
          const distrito = this.distritos.find((d) => d.id === distritoId);
          if (distrito) {
            this.registerForm.patchValue({
              ubigeo: String(distrito.id_ubigeo), // ← Convertir a string
            });
          }
        }
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

  setupDniAutoComplete(): void {
    // Escuchar cambios en el número de documento para DNI
    this.registerForm
      .get('numero_documento')
      ?.valueChanges.pipe(debounceTime(800), distinctUntilChanged())
      .subscribe((numeroDocumento) => {
        this.consultarDni(numeroDocumento);
      });

    // Limpiar campos cuando cambie el tipo de documento
    this.registerForm.get('tipo_documento_id')?.valueChanges.subscribe(() => {
      this.registerForm.patchValue({
        nombres: '',
        apellidos: '',
      });
      this.dniStatus = 'idle';
    });
  }

  // Antes de la modificación hay esta línea:
  // consultarDni(numeroDocumento: string): void {

  consultarDni(numeroDocumento: string): void {
    // Solo consultar si es DNI (tipo 1) y tiene 8 dígitos, o RUC y tiene 11 dígitos
    const tipoDocumento = this.registerForm.get('tipo_documento_id')?.value;
    
    if (numeroDocumento && (
      (tipoDocumento === '1' && numeroDocumento.length === 8 && /^\d{8}$/.test(numeroDocumento)) ||
      (tipoDocumento === '4' && numeroDocumento.length === 11 && /^\d{11}$/.test(numeroDocumento))
    )) {
      this.isDniLoading = true;
      this.dniStatus = 'loading';

      // NUEVO: Esperar a que ambas validaciones se completen
      this.reniecService.buscarPorDni(numeroDocumento).subscribe({
        next: (response) => {
          this.isDniLoading = false;
          console.log('Respuesta completa del backend:', response);

          // MODIFICADO: Verificar el estado del documento antes de autocompletar
          // Esperar un momento para que checkDocumentoExists termine si está en progreso
          setTimeout(() => {
            if (this.documentoStatus === 'taken') {
              console.log('Documento ya registrado, no se autocompletarán los datos');
              this.dniStatus = 'error';
              return;
            }

            // Verificar si la respuesta contiene datos de RENIEC
            if (response.success !== false && (response.nombre || response.nombres || response.razonSocial)) {
              console.log('Datos encontrados:', {
                nombre: response.nombre,
                nombres: response.nombres,
                apellidoPaterno: response.apellidoPaterno,
                apellidoMaterno: response.apellidoMaterno,
                razonSocial: response.razonSocial
              });

              // Para DNI (8 dígitos)
              if (tipoDocumento === '1' && numeroDocumento.length === 8) {
                if (response.nombres && response.apellidoPaterno && response.apellidoMaterno) {
                  this.registerForm.patchValue({
                    nombres: response.nombres,
                    apellidos: `${response.apellidoPaterno} ${response.apellidoMaterno}`,
                  });
                } else if (response.nombre) {
                  const partes = response.nombre.split(' ');
                  const nombres = partes[0] || '';
                  const apellidos = partes.slice(1).join(' ') || '';
                  this.registerForm.patchValue({
                    nombres: nombres,
                    apellidos: apellidos,
                  });
                }
              } 
              // Para RUC (11 dígitos)
              else if (tipoDocumento === '4' && numeroDocumento.length === 11) {
                const razonSocial = response.razonSocial || response.nombre || '';
                this.registerForm.patchValue({
                  nombres: razonSocial,
                  apellidos: '',
                });
              }
              
              this.dniStatus = 'success';
            } else {
              console.warn('No se encontraron datos válidos en la respuesta:', response);
              this.dniStatus = 'error';
            }
          }, 100); // Pequeño delay para permitir que checkDocumentoExists termine
        },
        error: (error) => {
          this.isDniLoading = false;
          this.dniStatus = 'error';
          console.error('Error consultando documento:', error);
        },
      });
    } else {
      this.dniStatus = 'idle';
    }
  }

  // Después de la modificación continúa:
  // loadDocumentTypes(): void {

  loadDocumentTypes(): void {
    this.authService.getDocumentTypes().subscribe({
      next: (tipos) => {
        this.tiposDocumento = tipos;
      },
      error: (error) => {
        console.error('Error cargando tipos de documento:', error);
      },
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach((key) => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    // Nueva validación: verificar que el puzzle esté resuelto si se está mostrando
    if (this.showPuzzle && !this.puzzleSolved) {
      this.registerError = 'Debes completar el Captcha para continuar con el registro';
      return;
    }

    // Validar que las contraseñas coincidan
    if (
      this.registerForm.value.password !==
      this.registerForm.value.password_confirmation
    ) {
      this.registerError = 'Las contraseñas no coinciden';
      return;
    }

    // Verificar si hay errores de duplicados
    if (this.emailStatus === 'taken') {
      this.registerError = 'El correo electrónico ya está registrado';
      return;
    }

    if (this.documentoStatus === 'taken') {
      this.registerError = 'El número de documento ya está registrado';
      return;
    }

    this.isLoading = true;
    this.registerError = '';
    this.registerSuccess = '';

    const registerData = { ...this.registerForm.value };

    // Prueba de que el captcha se resolvió; el servidor la exige y la consume.
    registerData.captcha_token = this.puzzleToken;

    // Asegurar que ubigeo sea string si existe
    if (registerData.ubigeo) {
      registerData.ubigeo = String(registerData.ubigeo);
    }

    this.authService.register(registerData).subscribe({
      
            next: (response) => {
        this.isLoading = false;
        
        if (response.requires_verification) {
          this.registerSuccess = 'Cuenta creada exitosamente. Revisa tu correo para verificar tu cuenta.';
          // Redirigir a verificación después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/verify-email'], {
              queryParams: { email: registerData.email }
            });
          }, 2000);
        } else {
          this.registerSuccess = 'Cuenta creada exitosamente. Ya puedes iniciar sesión.';
          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/account']);
          }, 2000);
        }
        
        this.registerForm.reset();
      },


      error: (error) => {
        this.isLoading = false;

        if (error.status === 422) {
          if (error.error && error.error.errors) {
            const errors = error.error.errors;
            let errorMessage = 'Errores de validación:\n';

            Object.keys(errors).forEach((key) => {
              errorMessage += `• ${errors[key][0]}\n`;
            });

            this.registerError = errorMessage;
          } else {
            this.registerError = 'Error en los datos proporcionados.';
          }
        } else if (error.status === 0) {
          this.registerError =
            'Error de conexión. Verifica tu conexión a internet.';
        } else {
          this.registerError =
            'Error del servidor. Por favor, inténtalo más tarde.';
        }
      },
    });
  }

  toggleRegisterPasswordVisibility(): void {
    this.showRegisterPassword = !this.showRegisterPassword;
  }

 
  loginWithGoogle(): void {
    window.location.href = `${environment.baseUrl}/auth/google`;

  }

  // Getters para facilitar el acceso a los campos del formulario
  get registerNombres() {
    return this.registerForm.get('nombres');
  }
  get registerApellidos() {
    return this.registerForm.get('apellidos');
  }
  get registerEmail() {
    return this.registerForm.get('email');
  }
  get registerTipoDocumento() {
    return this.registerForm.get('tipo_documento_id');
  }
  get registerNumeroDocumento() {
    return this.registerForm.get('numero_documento');
  }
  get registerPassword() {
    return this.registerForm.get('password');
  }
  get registerPasswordConfirmation() {
    return this.registerForm.get('password_confirmation');
  }

  /**
   * Devuelve todas las piezas a la bandeja sin pedir otro desafío: el token
   * sigue siendo válido, solo se vacía el tablero.
   */
  resetPuzzle(): void {
    this.puzzleSolved = false;
    this.puzzleError = false;
    this.puzzleMensaje = '';

    const colocadas = this.puzzleBoard.filter(Boolean);
    this.puzzleBoard = [null, null, null, null];
    this.puzzlePieces = this.shuffle([...this.puzzlePieces, ...colocadas]);
  }
}
























































