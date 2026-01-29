import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  isLoading: boolean = false;
  error: string = '';
  success: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  token: string = '';
  email: string = '';
  isValidToken: boolean | null = null;
  resetSuccess: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener token y email de los parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
      
      if (!this.token || !this.email) {
        this.error = 'Enlace de recuperación inválido';
        this.isValidToken = false;
        return;
      }
      
      this.verifyToken();
    });

    this.initForm();
    
    // Si ya está logueado, redirigir
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  initForm(): void {
    this.resetForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator
      ]],
      password_confirmation: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  verifyToken(): void {
    this.authService.verifyResetToken(this.token, this.email).subscribe({
      next: (response) => {
        this.isValidToken = response.valid;
        if (!response.valid) {
          this.error = 'El enlace de recuperación es inválido o ha expirado';
        }
      },
      error: (error) => {
        this.isValidToken = false;
        this.error = 'El enlace de recuperación es inválido o ha expirado';
      }
    });
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = '';

    const password = this.resetForm.value.password;
    const passwordConfirmation = this.resetForm.value.password_confirmation;

    this.authService.resetPassword(this.token, this.email, password, passwordConfirmation).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = response.message;
        this.resetSuccess = true;
      },
      error: (error) => {
        this.isLoading = false;
        
        if (error.status === 422 && error.error?.errors) {
          const errors = error.error.errors;
          if (errors.password) {
            this.error = errors.password[0];
          } else if (errors.token) {
            this.error = 'Token de recuperación inválido o expirado';
          } else {
            this.error = 'Por favor, verifica los datos ingresados.';
          }
        } else if (error.error?.message) {
          this.error = error.error.message;
        } else {
          this.error = 'Error al restablecer la contraseña. Inténtalo de nuevo.';
        }
      }
    });
  }

  // Validador personalizado para contraseña
  passwordValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasMinLength = value.length >= 8;

    const valid = hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
    
    if (!valid) {
      return { 
        passwordStrength: {
          hasUpperCase,
          hasLowerCase, 
          hasNumber,
          hasMinLength
        }
      };
    }
    
    return null;
  }

  // Validador para confirmar que las contraseñas coinciden
  passwordMatchValidator(form: any) {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirmation');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/account']);
  }

  // Getters para facilitar el acceso en el template
  get password() { 
    return this.resetForm.get('password'); 
  }
  
  get passwordConfirmation() { 
    return this.resetForm.get('password_confirmation'); 
  }

  get passwordErrors() {
    return this.password?.errors?.['passwordStrength'] || {};
  }

  get hasPasswordMismatch() {
    return this.resetForm.errors?.['passwordMismatch'] && 
           this.passwordConfirmation?.touched;
  }
}
