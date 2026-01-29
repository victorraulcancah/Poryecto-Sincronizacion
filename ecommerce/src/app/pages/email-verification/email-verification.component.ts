import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './email-verification.component.html',
  styleUrl: './email-verification.component.scss'
})
export class EmailVerificationComponent implements OnInit {
  verificationForm!: FormGroup;
  isLoading: boolean = false;
  isResending: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkUrlParams();
  }

  initForm(): void {
    this.verificationForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      token: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  checkUrlParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.verificationForm.patchValue({
          email: params['email']
        });
      }
      
      if (params['verified'] === 'true') {
        this.setMessage('¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.', 'success');
        setTimeout(() => {
          this.router.navigate(['/account']);
        }, 3000);
      } else if (params['already_verified'] === 'true') {
        // Ya no mostrar mensaje aquí, se maneja en account
        this.router.navigate(['/account'], { 
          queryParams: { already_verified: 'true', email: params['email'] } 
        });
      } else if (params['error']) {
        if (params['error'] === 'invalid_link') {
          this.setMessage('El enlace de verificación no es válido', 'error');
        } else if (params['error'] === 'invalid_token') {
          this.setMessage('El token de verificación es inválido o ha expirado', 'error');
        }
      }
    });
  }

  onVerify(): void {
    if (this.verificationForm.invalid) {
      Object.keys(this.verificationForm.controls).forEach(key => {
        const control = this.verificationForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.message = '';

    const verificationData = {
      email: this.verificationForm.value.email,
      token: this.verificationForm.value.token
    };

    this.authService.verifyEmail(verificationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.setMessage(response.message, 'success');
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/account'], { 
            queryParams: { verified: 'true' } 
          });
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        
        if (error.status === 400) {
          this.setMessage(error.error.message || 'Token de verificación inválido', 'error');
        } else {
          this.setMessage('Error al verificar la cuenta. Inténtalo nuevamente.', 'error');
        }
      }
    });
  }

  onResendVerification(): void {
    const email = this.verificationForm.get('email')?.value;
    
    if (!email || this.verificationForm.get('email')?.invalid) {
      this.setMessage('Por favor, ingresa un correo electrónico válido', 'error');
      return;
    }

    this.isResending = true;
    this.message = '';

    this.authService.resendVerification(email).subscribe({
      next: (response) => {
        this.isResending = false;
        this.setMessage(response.message, 'success');
      },
      error: (error) => {
        this.isResending = false;
        
        if (error.status === 404) {
          this.setMessage(error.error.message || 'Usuario no encontrado', 'error');
        } else {
          this.setMessage('Error al reenviar el código. Inténtalo nuevamente.', 'error');
        }
      }
    });
  }

  private setMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.message = message;
    this.messageType = type;
  }

  // Getters para el formulario
  get email() { return this.verificationForm.get('email'); }
  get token() { return this.verificationForm.get('token'); }
}
