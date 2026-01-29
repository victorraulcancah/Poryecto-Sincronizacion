import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BannerOfertaService, BannerOferta } from '../../../../services/banner-oferta.service';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-banner-oferta-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './banner-oferta-modal.component.html',
  styleUrl: './banner-oferta-modal.component.scss'
})
export class BannerOfertaModalComponent implements OnChanges {
  @Input() banner: BannerOferta | null = null;
  @Output() bannerGuardado = new EventEmitter<void>();
  @Output() modalCerrado = new EventEmitter<void>();

  bannerForm: FormGroup;
  imagenPreview: string | null = null;
  imagenFile: File | null = null;
  isSubmitting = false;
  esEdicion = false;

  constructor(
    private fb: FormBuilder,
    private bannerOfertaService: BannerOfertaService
  ) {
    this.bannerForm = this.fb.group({
      tipo: ['especiales', [Validators.required]],
      activo: [true],
      prioridad: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['banner'] && this.banner) {
      this.esEdicion = true;
      this.cargarDatosBanner();
    } else if (changes['banner'] && !this.banner) {
      this.esEdicion = false;
      this.resetForm();
    }
  }

  cargarDatosBanner(): void {
    if (this.banner) {
      this.bannerForm.patchValue({
        tipo: this.banner.tipo || 'especiales',
        activo: this.banner.activo,
        prioridad: this.banner.prioridad
      });
      this.imagenPreview = this.banner.imagen_url || null;
    }
  }

  onImagenSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imagenFile = file;

      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  guardar(): void {
    if (this.bannerForm.invalid) {
      Swal.fire('Error', 'Por favor completa todos los campos requeridos', 'error');
      return;
    }

    if (!this.esEdicion && !this.imagenFile) {
      Swal.fire('Error', 'Debes seleccionar una imagen para el banner', 'error');
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('tipo', this.bannerForm.value.tipo);
    formData.append('activo', this.bannerForm.value.activo ? '1' : '0');
    formData.append('prioridad', this.bannerForm.value.prioridad);

    if (this.imagenFile) {
      formData.append('imagen', this.imagenFile);
    }

    const request = this.esEdicion
      ? this.bannerOfertaService.update(this.banner!.id!, formData)
      : this.bannerOfertaService.create(formData);

    request.subscribe({
      next: () => {
        Swal.fire('Éxito', `Banner ${this.esEdicion ? 'actualizado' : 'creado'} correctamente`, 'success');
        this.bannerGuardado.emit();
        this.cerrarModal();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        Swal.fire('Error', 'No se pudo guardar el banner', 'error');
        this.isSubmitting = false;
      }
    });
  }

  resetForm(): void {
    this.bannerForm.reset({
      tipo: 'especiales',
      activo: true,
      prioridad: 0
    });
    this.imagenPreview = null;
    this.imagenFile = null;
  }

  cerrarModal(): void {
    const modalElement = document.getElementById('modalCrearBannerOferta');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
    this.resetForm();
    this.modalCerrado.emit();
  }
}
