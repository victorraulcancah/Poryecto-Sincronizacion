import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoUploadService } from '../../services/photo-upload.service';

@Component({
  selector: 'app-modal-foto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-foto.component.html',
  styleUrl: './modal-foto.component.scss'
})
export class ModalFotoComponent {
  @Input() isVisible: boolean = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onFotoActualizada = new EventEmitter<void>();

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploading: boolean = false;
  errorMessage: string = '';

  constructor(private photoUploadService: PhotoUploadService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.errorMessage = '';

      // Validaciones
      if (file.size > 2 * 1024 * 1024) { // 2MB
        this.errorMessage = 'El archivo no debe superar los 2MB';
        this.selectedFile = null;
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        this.errorMessage = 'Solo se permiten archivos JPG, PNG o GIF';
        this.selectedFile = null;
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadFoto(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Por favor selecciona una imagen';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    this.photoUploadService.uploadClientPhoto(this.selectedFile).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.onFotoActualizada.emit();
        this.cerrarModal();
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = error.error?.message || 'Error al subir la imagen';
      }
    });
  }

  deleteFoto(): void {
    this.isUploading = true;
    this.errorMessage = '';

    this.photoUploadService.deleteClientPhoto().subscribe({
      next: (response) => {
        this.isUploading = false;
        this.onFotoActualizada.emit();
        this.cerrarModal();
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = error.error?.message || 'Error al eliminar la imagen';
      }
    });
  }

  cerrarModal(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.errorMessage = '';
    this.onClose.emit();
  }

  // Prevenir cierre del modal al hacer clic en el contenido
  onModalContentClick(event: Event): void {
    event.stopPropagation();
  }
}