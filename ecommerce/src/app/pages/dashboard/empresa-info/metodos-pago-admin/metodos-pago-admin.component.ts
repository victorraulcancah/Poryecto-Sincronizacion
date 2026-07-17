// src/app/pages/dashboard/empresa-info/metodos-pago-admin/metodos-pago-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SobreNosotrosService } from '../../../../services/sobre-nosotros.service';
import { EmpresaInfoService } from '../../../../services/empresa-info.service';
import { PermissionsService } from '../../../../services/permissions.service';
import { EmpresaMetodoPago } from '../../../../types/sobre-nosotros.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-metodos-pago-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './metodos-pago-admin.component.html',
  styleUrl: './metodos-pago-admin.component.scss',
})
export class MetodosPagoAdminComponent implements OnInit {
  metodos: EmpresaMetodoPago[] = [];
  isLoading = true;
  mostrarForm = false;
  metodoEditando: EmpresaMetodoPago | null = null;
  metodoForm: FormGroup;
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private sobreNosotrosService: SobreNosotrosService,
    private empresaInfoService: EmpresaInfoService,
    public permissionsService: PermissionsService
  ) {
    this.metodoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      orden: [0],
      activo: [true],
    });
  }

  ngOnInit(): void {
    this.cargarMetodos();
  }

  puedeEditar(): boolean {
    return this.permissionsService.canEditEmpresaInfo();
  }

  cargarMetodos(): void {
    this.isLoading = true;
    this.sobreNosotrosService.obtenerMetodosPago().subscribe({
      next: (metodos) => {
        this.metodos = metodos;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  nuevoMetodo(): void {
    this.metodoEditando = null;
    this.metodoForm.reset({ nombre: '', orden: this.metodos.length, activo: true });
    this.imagenSeleccionada = null;
    this.imagenPreview = null;
    this.mostrarForm = true;
  }

  editarMetodo(metodo: EmpresaMetodoPago): void {
    this.metodoEditando = metodo;
    this.metodoForm.patchValue({
      nombre: metodo.nombre,
      orden: metodo.orden,
      activo: metodo.activo,
    });
    this.imagenSeleccionada = null;
    this.imagenPreview = metodo.imagen_url || null;
    this.mostrarForm = true;
  }

  cancelarForm(): void {
    this.mostrarForm = false;
    this.metodoEditando = null;
  }

  onImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.imagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  guardarMetodo(): void {
    if (!this.metodoForm.valid) {
      this.metodoForm.markAllAsTouched();
      return;
    }

    if (!this.metodoEditando && !this.imagenSeleccionada) {
      Swal.fire({
        title: 'Falta el ícono',
        text: 'Debes subir un ícono/imagen para el nuevo método de pago.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.isSaving = true;
    const formValue = {
      ...this.metodoForm.value,
      imagen: this.imagenSeleccionada || undefined,
    };

    const request = this.metodoEditando
      ? this.sobreNosotrosService.actualizarMetodoPago(this.metodoEditando.id, formValue)
      : this.sobreNosotrosService.crearMetodoPago(formValue);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.mostrarForm = false;
        this.cargarMetodos();
        this.empresaInfoService.refreshPublicInfo();
      },
      error: () => {
        this.isSaving = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el método de pago. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#dc3545',
        });
      },
    });
  }

  eliminarMetodo(metodo: EmpresaMetodoPago): void {
    Swal.fire({
      title: '¿Eliminar método de pago?',
      html: `Estás a punto de eliminar <strong>"${metodo.nombre}"</strong>. Dejará de mostrarse en el footer de la tienda.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.sobreNosotrosService.eliminarMetodoPago(metodo.id).subscribe({
          next: () => {
            this.cargarMetodos();
            this.empresaInfoService.refreshPublicInfo();
          },
          error: () =>
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el método de pago.',
              icon: 'error',
              confirmButtonColor: '#dc3545',
            }),
        });
      }
    });
  }
}
