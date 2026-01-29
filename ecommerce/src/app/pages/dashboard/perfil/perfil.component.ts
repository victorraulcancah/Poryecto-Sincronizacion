import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  perfilForm!: FormGroup;
  passwordForm!: FormGroup;
  isLoading = false;
  showPasswordModal = false;
  currentUser: any = null;

  // Preview de imagen
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  initForms(): void {
    // Formulario de perfil
    this.perfilForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.pattern('^[9][0-9]{8}$')]],
      direccion: [''],
    });

    // Formulario de cambio de contraseña
    this.passwordForm = this.fb.group(
      {
        current_password: ['', [Validators.required]],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        new_password_confirmation: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('new_password')?.value;
    const confirmPassword = group.get('new_password_confirmation')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  loadUserData(): void {
    this.isLoading = true;
    this.authService.currentUser.subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.perfilForm.patchValue({
            name: user.name,
            email: user.email,
            telefono: user.telefono || '',
            direccion: user.direccion || '',
          });

          // Cargar imagen de perfil si existe
          if (user.avatar) {
            // Si la URL ya es completa (empieza con http), usarla directamente
            // Si no, es una ruta relativa y necesita el prefijo del backend
            this.imagePreview = user.avatar.startsWith('http') 
              ? user.avatar 
              : user.avatar;
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.isLoading = false;
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmitPerfil(): void {
    if (this.perfilForm.invalid) {
      Object.keys(this.perfilForm.controls).forEach((key) => {
        this.perfilForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const formData = new FormData();

    // Agregar datos del formulario
    Object.keys(this.perfilForm.value).forEach((key) => {
      formData.append(key, this.perfilForm.value[key]);
    });

    // Agregar imagen si se seleccionó
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }

    this.authService.updateProfile(formData).subscribe({
      next: (response: any) => {
        Swal.fire('¡Éxito!', 'Perfil actualizado correctamente', 'success');
        this.selectedFile = null;
        this.loadUserData();
        this.isLoading = false;
      },
      error: (error: any) => {
        Swal.fire(
          'Error',
          error.error?.message || 'Error al actualizar perfil',
          'error'
        );
        this.isLoading = false;
      },
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.passwordForm.reset();
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordForm.reset();
  }

  onSubmitPassword(): void {
    if (this.passwordForm.invalid) {
      Object.keys(this.passwordForm.controls).forEach((key) => {
        this.passwordForm.get(key)?.markAsTouched();
      });
      return;
    }

    const passwordData = this.passwordForm.value;

    this.authService.changePassword(passwordData).subscribe({
      next: (response: any) => {
        Swal.fire('¡Éxito!', 'Contraseña actualizada correctamente', 'success');
        this.closePasswordModal();
      },
      error: (error: any) => {
        Swal.fire(
          'Error',
          error.error?.message || 'Error al cambiar contraseña',
          'error'
        );
      },
    });
  }

  getRoleName(): string {
    if (!this.currentUser?.roles || this.currentUser.roles.length === 0) {
      return 'Sin rol asignado';
    }
    return this.currentUser.roles.map((r: any) => r.name).join(', ');
  }

  getInitials(): string {
    if (!this.currentUser?.name) return 'U';
    const names = this.currentUser.name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  }
}
