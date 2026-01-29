import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TipoPagoService, TipoPago } from '../../../services/tipo-pago.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipos-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tipos-pago.component.html',
  styleUrl: './tipos-pago.component.scss'
})
export class TiposPagoComponent implements OnInit {
  tiposPago: TipoPago[] = [];
  tipoPagoForm!: FormGroup;
  isEditMode = false;
  selectedId: number | null = null;
  isLoading = false;
  showModal = false;

  constructor(
    private fb: FormBuilder,
    private tipoPagoService: TipoPagoService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadTiposPago();
  }

  initForm(): void {
    this.tipoPagoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      codigo: ['', [Validators.required]],
      descripcion: [''],
      icono: [''],
      activo: [true],
      orden: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadTiposPago(): void {
    this.isLoading = true;
    this.tipoPagoService.obtenerTodos().subscribe({
      next: (response) => {
        this.tiposPago = response.tipos_pago;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar tipos de pago:', error);
        this.isLoading = false;
        Swal.fire('Error', 'No se pudieron cargar los tipos de pago', 'error');
      }
    });
  }

  openModal(tipoPago?: TipoPago): void {
    this.showModal = true;
    if (tipoPago) {
      this.isEditMode = true;
      this.selectedId = tipoPago.id!;
      this.tipoPagoForm.patchValue(tipoPago);
    } else {
      this.isEditMode = false;
      this.selectedId = null;
      this.tipoPagoForm.reset({ activo: true, orden: 0 });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.tipoPagoForm.reset();
  }

  onSubmit(): void {
    if (this.tipoPagoForm.invalid) {
      Object.keys(this.tipoPagoForm.controls).forEach(key => {
        this.tipoPagoForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.tipoPagoForm.value;

    if (this.isEditMode && this.selectedId) {
      this.tipoPagoService.actualizar(this.selectedId, formData).subscribe({
        next: (response) => {
          Swal.fire('¡Éxito!', response.message, 'success');
          this.closeModal();
          this.loadTiposPago();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Error al actualizar', 'error');
        }
      });
    } else {
      this.tipoPagoService.crear(formData).subscribe({
        next: (response) => {
          Swal.fire('¡Éxito!', response.message, 'success');
          this.closeModal();
          this.loadTiposPago();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Error al crear', 'error');
        }
      });
    }
  }

  toggleEstado(id: number): void {
    this.tipoPagoService.toggleEstado(id).subscribe({
      next: (response) => {
        Swal.fire('¡Éxito!', response.message, 'success');
        this.loadTiposPago();
      },
      error: (error) => {
        Swal.fire('Error', error.error?.message || 'Error al cambiar estado', 'error');
      }
    });
  }

  eliminar(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tipoPagoService.eliminar(id).subscribe({
          next: (response) => {
            Swal.fire('¡Eliminado!', response.message, 'success');
            this.loadTiposPago();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'Error al eliminar', 'error');
          }
        });
      }
    });
  }

  // Getters para el template
  get tiposPagoActivos(): number {
    return this.tiposPago.filter(t => t.activo).length;
  }

  get tiposPagoInactivos(): number {
    return this.tiposPago.filter(t => !t.activo).length;
  }
}
