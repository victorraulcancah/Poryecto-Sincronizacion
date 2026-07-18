import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datos-personales.component.html',
  styleUrl: './datos-personales.component.scss'
})
export class DatosPersonalesComponent implements OnInit {
  currentUser: User | null = null;

  editandoCelular = false;
  celularEditado = '';
  isSavingCelular = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // ✅ Refrescar con datos frescos del servidor por si la sesión ya estaba
    // abierta antes de que existieran estos campos en el perfil.
    this.authService.refreshUserData().subscribe({
      next: () => {
        this.currentUser = this.authService.getCurrentUser();
      },
      error: () => {},
    });
  }

  get codigoCliente(): string {
    return this.currentUser?.id ? `#${this.currentUser.id}` : '-';
  }

  get razonSocialONombre(): string {
    return this.currentUser?.nombre_completo || this.currentUser?.name || '-';
  }

  editarCelular(): void {
    this.celularEditado = this.currentUser?.telefono || '';
    this.editandoCelular = true;
  }

  cancelarEdicionCelular(): void {
    this.editandoCelular = false;
    this.celularEditado = '';
  }

  guardarCelular(): void {
    const valor = (this.celularEditado || '').trim();

    if (!/^9[0-9]{8}$/.test(valor)) {
      Swal.fire({
        title: 'Celular inválido',
        text: 'Ingresa un celular peruano válido: 9 dígitos, empieza con 9.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.isSavingCelular = true;
    this.authService.actualizarTelefono(valor).subscribe({
      next: () => {
        this.isSavingCelular = false;
        this.currentUser = this.authService.getCurrentUser();
        this.editandoCelular = false;
        Swal.fire({
          title: '¡Actualizado!',
          text: 'Tu celular se actualizó correctamente.',
          icon: 'success',
          confirmButtonColor: '#198754',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (error) => {
        this.isSavingCelular = false;
        const mensaje = error.error?.errors?.telefono?.[0] || error.error?.message || 'No se pudo actualizar el celular.';
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
