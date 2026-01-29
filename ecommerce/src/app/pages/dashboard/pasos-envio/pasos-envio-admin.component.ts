import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface PasoEnvio {
  id?: number;
  orden: number;
  titulo: string;
  descripcion: string;
  imagen: string | null;
  activo: boolean;
}

@Component({
  selector: 'app-pasos-envio-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pasos-envio-admin.component.html',
  styleUrls: ['./pasos-envio-admin.component.scss']
})
export class PasosEnvioAdminComponent implements OnInit {
  pasos: PasoEnvio[] = [];
  isLoading = true;
  isSaving = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Formulario
  showForm = false;
  isEditing = false;
  currentPaso: PasoEnvio = this.getEmptyPaso();
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('🔍 Estado inicial showForm:', this.showForm);
    this.cargarPasos();
  }

  getEmptyPaso(): PasoEnvio {
    return {
      orden: 1,
      titulo: '',
      descripcion: '',
      imagen: null,
      activo: true
    };
  }

  cargarPasos(): void {
    this.isLoading = true;
    this.error = null;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get(
      `${environment.apiUrl}/admin/pasos-envio`,
      { headers, responseType: 'text' }
    ).subscribe({
      next: (response: any) => {
        try {
          // Limpiar warnings de PHP antes de parsear JSON
          let cleanResponse = response;
          if (typeof response === 'string') {
            const jsonStart = response.indexOf('{');
            if (jsonStart > 0) {
              cleanResponse = response.substring(jsonStart);
            }
            cleanResponse = JSON.parse(cleanResponse);
          }

          if (cleanResponse.success) {
            this.pasos = cleanResponse.data;
          }
        } catch (e) {
          console.error('Error al parsear respuesta:', e);
          this.error = 'Error al procesar los datos';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar pasos:', err);
        this.error = 'No se pudieron cargar los pasos de envío';
        this.isLoading = false;
      }
    });
  }

  abrirFormulario(paso?: PasoEnvio): void {
    this.showForm = true;
    this.isEditing = !!paso;
    this.currentPaso = paso ? { ...paso } : this.getEmptyPaso();
    this.imagePreview = paso?.imagen || null;
    this.selectedFile = null;
  }

  cerrarFormulario(): void {
    this.showForm = false;
    this.isEditing = false;
    this.currentPaso = this.getEmptyPaso();
    this.selectedFile = null;
    this.imagePreview = null;
    this.error = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagen(): void {
    if (!this.currentPaso.id) {
      this.selectedFile = null;
      this.imagePreview = null;
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.delete(
      `${environment.apiUrl}/admin/pasos-envio/${this.currentPaso.id}/imagen`,
      { headers }
    ).subscribe({
      next: () => {
        this.currentPaso.imagen = null;
        this.imagePreview = null;
        this.selectedFile = null;
        this.showSuccess('Imagen eliminada exitosamente');
        this.cargarPasos();
      },
      error: (err) => {
        console.error('Error al eliminar imagen:', err);
        this.error = 'No se pudo eliminar la imagen';
      }
    });
  }

  guardarPaso(): void {
    if (!this.validarFormulario()) return;

    this.isSaving = true;
    this.error = null;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const formData = new FormData();
    formData.append('orden', this.currentPaso.orden.toString());
    formData.append('titulo', this.currentPaso.titulo);
    formData.append('descripcion', this.currentPaso.descripcion);
    formData.append('activo', this.currentPaso.activo ? '1' : '0');

    if (this.selectedFile) {
      formData.append('imagen', this.selectedFile);
    }

    const url = this.isEditing
      ? `${environment.apiUrl}/admin/pasos-envio/${this.currentPaso.id}`
      : `${environment.apiUrl}/admin/pasos-envio`;

    this.http.post(url, formData, { headers, responseType: 'text' }).subscribe({
      next: (response: any) => {
        try {
          // Limpiar warnings de PHP antes de parsear JSON
          let cleanResponse = response;
          if (typeof response === 'string') {
            // Buscar el inicio del JSON (después de cualquier warning de PHP)
            const jsonStart = response.indexOf('{');
            if (jsonStart > 0) {
              cleanResponse = response.substring(jsonStart);
            }
            cleanResponse = JSON.parse(cleanResponse);
          }

          if (cleanResponse.success) {
            this.showSuccess(
              this.isEditing
                ? 'Paso actualizado exitosamente'
                : 'Paso creado exitosamente'
            );
            this.cargarPasos();
            this.cerrarFormulario();
          } else {
            this.error = cleanResponse.message || 'No se pudo guardar el paso';
          }
        } catch (e) {
          console.error('Error al parsear respuesta:', e);
          this.error = 'Error al procesar la respuesta del servidor';
        }
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error al guardar paso:', err);
        this.error = 'No se pudo guardar el paso';
        this.isSaving = false;
      }
    });
  }

  eliminarPaso(paso: PasoEnvio): void {
    if (!confirm(`¿Estás seguro de eliminar el paso "${paso.titulo}"?`)) return;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.delete(
      `${environment.apiUrl}/admin/pasos-envio/${paso.id}`,
      { headers, responseType: 'text' }
    ).subscribe({
      next: (response: any) => {
        try {
          let cleanResponse = response;
          if (typeof response === 'string') {
            const jsonStart = response.indexOf('{');
            if (jsonStart > 0) {
              cleanResponse = response.substring(jsonStart);
            }
            cleanResponse = JSON.parse(cleanResponse);
          }
          
          if (cleanResponse.success) {
            this.showSuccess('Paso eliminado exitosamente');
            this.cargarPasos();
          }
        } catch (e) {
          console.error('Error al parsear respuesta:', e);
        }
      },
      error: (err) => {
        console.error('Error al eliminar paso:', err);
        this.error = 'No se pudo eliminar el paso';
      }
    });
  }

  validarFormulario(): boolean {
    if (!this.currentPaso.titulo.trim()) {
      this.error = 'El título es obligatorio';
      return false;
    }
    if (!this.currentPaso.descripcion.trim()) {
      this.error = 'La descripción es obligatoria';
      return false;
    }
    if (this.currentPaso.orden < 1) {
      this.error = 'El orden debe ser mayor a 0';
      return false;
    }
    return true;
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/placeholder-step.png';
  }
}
