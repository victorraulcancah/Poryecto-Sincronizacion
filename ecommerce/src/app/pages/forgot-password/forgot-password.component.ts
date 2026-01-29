import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm!: FormGroup;
  isLoading: boolean = false;
  error: string = '';
  success: string = '';
  emailSent: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Si ya está logueado, redirigir
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  initForm(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.success = '';

    const email = this.forgotForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = response.message;
        this.emailSent = true;
      },
      error: (error) => {
        this.isLoading = false;
        
        if (error.status === 422 && error.error?.errors) {
          const errors = error.error.errors;
          if (errors.email) {
            this.error = errors.email[0];
          } else {
            this.error = 'Por favor, verifica los datos ingresados.';
          }
        } else if (error.error?.message) {
          this.error = error.error.message;
        } else {
          this.error = 'Error al enviar el correo. Inténtalo de nuevo.';
        }
      }
    });
  }

  get email() { 
    return this.forgotForm.get('email'); 
  }
}
