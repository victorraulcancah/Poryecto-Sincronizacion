import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent {
  passwordForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.passwordForm = this.fb.group(
      {
        current_password: ['', [Validators.required]],
        new_password: ['', [Validators.required, this.passwordStrengthValidator]],
        new_password_confirmation: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  // Validador de fortaleza: mínimo 8 caracteres, mayúscula, minúscula y número
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);

    if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber) {
      return null;
    }
    return { passwordStrength: { hasMinLength, hasUpperCase, hasLowerCase, hasNumber } };
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('new_password')?.value;
    const confirmation = group.get('new_password_confirmation')?.value;
    return newPassword === confirmation ? null : { passwordMismatch: true };
  }

  get nuevaContrasena() {
    return this.passwordForm.get('new_password');
  }

  get confirmacionContrasena() {
    return this.passwordForm.get('new_password_confirmation');
  }

  // Se recalcula directamente del valor (no de los errores) para que los checks
  // se muestren en verde incluso cuando el campo completo ya es válido.
  get passwordChecks() {
    const value = this.nuevaContrasena?.value || '';
    return {
      hasMinLength: value.length >= 8,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumber: /\d/.test(value),
    };
  }

  get hasPasswordMismatch(): boolean {
    return !!this.passwordForm.errors?.['passwordMismatch'] && !!this.confirmacionContrasena?.touched;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const { current_password, new_password, new_password_confirmation } = this.passwordForm.value;

    this.authService
      .changePassword({ current_password, new_password, new_password_confirmation })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.passwordForm.reset();
          Swal.fire({
            title: '¡Contraseña actualizada!',
            text: 'Tu contraseña se cambió correctamente.',
            icon: 'success',
            confirmButtonColor: '#198754',
            timer: 2500,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          const mensaje =
            error.error?.errors?.current_password?.[0] ||
            error.error?.errors?.new_password?.[0] ||
            error.error?.message ||
            'No se pudo actualizar la contraseña.';
          Swal.fire({
            title: 'Error',
            text: mensaje,
            icon: 'error',
            confirmButtonColor: '#dc3545',
          });
        },
      });
  }
}
