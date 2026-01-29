// src/app/pages/account/account.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
  import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbComponent,
    ShippingComponent,
    ReactiveFormsModule
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit {
  loginForm!: FormGroup;
  loginError: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  showSuccessMessage: boolean = false;
  showInfoMessage: boolean = false;
  successMessage: string = '';
  infoMessage: string = '';
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute, 
  ) {}

 ngOnInit(): void {
  this.initForms();
       
  // Si el usuario ya está logueado, redirigir a la página principal
  if (this.authService.isLoggedIn()) {
    this.router.navigate(['/']);
  }

  // Verificar si hay mensajes de verificación exitosa y errores de Google auth
this.route.queryParams.subscribe((params: any) => {
  if (params['verified'] === 'true') {
    this.showSuccessToast('¡Cuenta verificada exitosamente! Ingresa tu contraseña para continuar');
    
    // Autocompletar email si viene en la URL
    if (params['email']) {
      this.loginForm.patchValue({
        email: params['email']
      });
    }
    
    this.clearQueryParams();
  } else if (params['already_verified'] === 'true') {
    this.showSuccessToast('¡Cuenta verificada exitosamente! Ingresa tu contraseña para continuar');
    
    // Autocompletar email si viene en la URL
    if (params['email']) {
      this.loginForm.patchValue({
        email: params['email']
      });
    }
    
    this.clearQueryParams();
    } else if (params['error'] === 'auth_processing_failed') {
      this.loginError = 'Error procesando la autenticación con Google. Inténtalo de nuevo.';
    } else if (params['error'] === 'google_auth_failed') {
      this.loginError = 'Error en la autenticación con Google. Inténtalo de nuevo.';
    }
  });
}

  initForms(): void {
    // Formulario de login
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    const credentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    // Usar el login unificado que maneja tanto admin como cliente
    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Guardar "remember me" si está marcado
        if (this.loginForm.value.remember) {
          localStorage.setItem('remember_email', credentials.email);
        } else {
          localStorage.removeItem('remember_email');
        }

        // Redirigir según el tipo de usuario
        if (response.tipo_usuario === 'admin') {
          this.router.navigate(['/dashboard']);
        } else if (response.tipo_usuario === 'cliente') {
          this.router.navigate(['/']); // E-commerce home
        } else if (response.tipo_usuario === 'motorizado') {
          this.router.navigate(['/motorizado/dashboard']); // Dashboard del motorizado
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.handleLoginError(error);
      }
    });
  }

  private handleLoginError(error: any): void {
    if (error.status === 403 && error.error.requires_verification) {
      // Redirigir a verificación si la cuenta no está verificada
      this.router.navigate(['/verify-email'], {
        queryParams: { email: this.loginForm.value.email }
      });
      return;
    }
    
    if (error.status === 401) {
      this.loginError = 'Las credenciales proporcionadas son incorrectas.';
    } else if (error.status === 403) {
      this.loginError = error.error.message || 'Tu cuenta está desactivada.';
    } else if (error.status === 422) {
      if (error.error && error.error.errors) {
        const errors = error.error.errors;
        if (errors.email && errors.email.length > 0) {
          this.loginError = errors.email[0];
        } else if (errors.password && errors.password.length > 0) {
          this.loginError = errors.password[0];
        } else {
          this.loginError = 'Por favor, verifica los datos ingresados.';
        }
      } else {
        this.loginError = 'Por favor, verifica los datos ingresados.';
      }
    } else if (error.status === 0) {
      this.loginError = 'Error de conexión. Verifica tu conexión a internet.';
    } else {
      this.loginError = 'Error del servidor. Por favor, inténtalo más tarde.';
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.baseUrl}/auth/google`;
  }

  // Getters para facilitar el acceso a los campos del formulario en el template
  get loginEmail() { return this.loginForm.get('email'); }
  get loginPassword() { return this.loginForm.get('password'); }

// Nuevas funciones para mensajes flotantes
  showSuccessToast(message: string): void {
    this.successMessage = message;
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 4000);
  }

  showInfoToast(message: string): void {
    this.infoMessage = message;
    this.showInfoMessage = true;
    setTimeout(() => {
      this.showInfoMessage = false;
    }, 4000);
  }

  clearQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  // Getters para facilitar el acceso a los campos del formulario en el template
}