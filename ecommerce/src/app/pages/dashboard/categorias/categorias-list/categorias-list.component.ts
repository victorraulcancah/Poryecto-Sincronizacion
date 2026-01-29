// src/app/pages/dashboard/categorias/categorias-list/categorias-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriasService, Categoria } from '../../../../services/categorias.service';
import { CategoriaModalComponent } from '../../../../component/categoria-modal/categoria-modal.component';
import { PermissionsService } from '../../../../services/permissions.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-categorias-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoriaModalComponent],
  template: `
    <div class="container-fluid">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-24">
        <div>
          <h4 class="text-heading fw-semibold mb-8">Categorías</h4>
          <p class="text-gray-500 mb-0">Administra las categorías de productos</p>
        </div>
        <button class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                data-bs-toggle="modal" 
                data-bs-target="#modalCrearCategoria">
          <i class="ph ph-plus me-8"></i>
          Nueva Categoría
        </button>
      </div>

      <!-- Tabla de categorías -->
      <div class="card border-0 shadow-sm rounded-12">
        <div class="card-body p-0">
          
          <!-- Loading state -->
          <div *ngIf="isLoading" class="text-center py-40">
            <div class="spinner-border text-main-600" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-gray-500 mt-12 mb-0">Cargando categorías...</p>
          </div>

          <!-- Tabla -->
          <div *ngIf="!isLoading" class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Imagen</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Nombre</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Descripción</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Estado</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0">Fecha Creación</th>
                  <th class="px-24 py-16 text-heading fw-semibold border-0 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let categoria of categorias" class="border-bottom border-gray-100">
                  <!-- Imagen -->
                  <td class="px-24 py-16">
                    <div class="w-48 h-48 bg-gray-100 rounded-8 flex-center overflow-hidden position-relative">
                      <img *ngIf="categoria.imagen_url" 
                           [src]="categoria.imagen_url" 
                           [alt]="categoria.nombre"
                           class="w-100 h-100 object-fit-cover"
                           (error)="onImageError($event)"
                           [id]="'img-' + categoria.id">
                      <i *ngIf="!categoria.imagen_url" 
                         class="ph ph-image text-gray-400 text-xl"
                         [id]="'placeholder-' + categoria.id"></i>
                    </div>
                  </td>

                  <!-- Resto del template igual... -->
                  <td class="px-24 py-16">
                    <h6 class="text-heading fw-semibold mb-4">{{ categoria.nombre }}</h6>
                  </td>

                  <td class="px-24 py-16">
                    <p class="text-gray-600 mb-0" 
                       [title]="categoria.descripcion">
                      {{ categoria.descripcion ? (categoria.descripcion.length > 50 ? categoria.descripcion.substring(0, 50) + '...' : categoria.descripcion) : 'Sin descripción' }}
                    </p>
                  </td>

                  <td class="px-24 py-16">
                    <span class="badge px-12 py-6 rounded-pill fw-medium"
                          [class]="categoria.activo ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'">
                      {{ categoria.activo ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>

                  <td class="px-24 py-16">
                    <span class="text-gray-500 text-sm">
                      {{ categoria.created_at | date:'dd/MM/yyyy' }}
                    </span>
                  </td>

                  <td class="px-24 py-16 text-center">
                    <div class="d-flex justify-content-center gap-8">
                      <button class="btn w-32 h-32 rounded-6 flex-center transition-2"
                              [class]="categoria.activo ? 'bg-warning-50 hover-bg-warning-100 text-warning-600' : 'bg-success-50 hover-bg-success-100 text-success-600'"
                              [title]="categoria.activo ? 'Desactivar' : 'Activar'"
                              (click)="toggleEstado(categoria)">
                        <i class="ph text-sm" 
                           [class]="categoria.activo ? 'ph-eye-slash' : 'ph-eye'"></i>
                      </button>

                      <button class="btn bg-main-50 hover-bg-main-100 text-main-600 w-32 h-32 rounded-6 flex-center transition-2"
                              title="Editar"
                              (click)="editarCategoria(categoria)">
                        <i class="ph ph-pencil text-sm"></i>
                      </button>

                      <button class="btn bg-danger-50 hover-bg-danger-100 text-danger-600 w-32 h-32 rounded-6 flex-center transition-2"
                              title="Eliminar"
                              (click)="eliminarCategoria(categoria)">
                        <i class="ph ph-trash text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Empty state -->
            <div *ngIf="categorias.length === 0" class="text-center py-40">
              <i class="ph ph-folder-open text-gray-300 text-6xl mb-16"></i>
              <h6 class="text-heading fw-semibold mb-8">No hay categorías</h6>
              <p class="text-gray-500 mb-16">Aún no has creado ninguna categoría</p>
              <button class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                      data-bs-toggle="modal" 
                      data-bs-target="#modalCrearCategoria">
                <i class="ph ph-plus me-8"></i>
                Crear primera categoría
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para crear/editar categoría -->
      <app-categoria-modal 
        [categoria]="categoriaSeleccionada"
        (categoriaGuardada)="onCategoriaGuardada()"
        (modalCerrado)="onModalCerrado()">
      </app-categoria-modal>
    </div>
  `,
  styles: [`
    .upload-area {
      transition: all 0.3s ease;
    }
    .upload-area:hover {
      border-color: var(--bs-main-600) !important;
    }
    .image-error {
      display: none !important;
    }
  `]
})
export class CategoriasListComponent implements OnInit {
  
  categorias: Categoria[] = [];
  isLoading = true;
  categoriaSeleccionada: Categoria | null = null;


  constructor(private categoriasService: CategoriasService, public permissionsService: PermissionsService) {}

  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.isLoading = true;
    this.categoriasService.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.isLoading = false;
      }
    });
  }

  editarCategoria(categoria: Categoria): void {
    this.categoriaSeleccionada = categoria;
    const modal = document.getElementById('modalCrearCategoria');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

eliminarCategoria(categoria: Categoria): void {
  Swal.fire({
    title: '¿Eliminar categoría?',
    html: `Estás a punto de eliminar la categoría <strong>"${categoria.nombre}"</strong>.<br>Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    customClass: {
      popup: 'rounded-12',
      confirmButton: 'rounded-8',
      cancelButton: 'rounded-8'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      this.categoriasService.eliminarCategoria(categoria.id).subscribe({
        next: () => {
          Swal.fire({
            title: '¡Eliminada!',
            text: 'La categoría ha sido eliminada exitosamente.',
            icon: 'success',
            confirmButtonColor: '#198754',
            customClass: {
              popup: 'rounded-12',
              confirmButton: 'rounded-8'
            }
          });
          this.cargarCategorias();
        },
        error: (error) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar la categoría. Inténtalo de nuevo.',
            icon: 'error',
            confirmButtonColor: '#dc3545',
            customClass: {
              popup: 'rounded-12',
              confirmButton: 'rounded-8'
            }
          });
          console.error('Error al eliminar categoría:', error);
        }
      });
    }
  });
}

  toggleEstado(categoria: Categoria): void {
    this.categoriasService.actualizarCategoria(categoria.id, { 
      activo: !categoria.activo 
    }).subscribe({
      next: () => {
        this.cargarCategorias();
      },
      error: (error) => {
        console.error('Error al actualizar categoría:', error);
      }
    });
  }

  onCategoriaGuardada(): void {
    this.cargarCategorias();
    this.categoriaSeleccionada = null;
  }

  onModalCerrado(): void {
    this.categoriaSeleccionada = null;
  }

  // 🔥 AQUÍ VA EL MÉTODO onImageError
  onImageError(event: any): void {
    console.error('Error al cargar imagen:', event);
    
    // Ocultar la imagen que falló
    event.target.style.display = 'none';
    event.target.classList.add('image-error');
    
    // Buscar el contenedor padre y mostrar el placeholder
    const container = event.target.closest('.w-48.h-48');
    if (container) {
      // Crear o mostrar el icono placeholder
      let placeholder = container.querySelector('.ph-image');
      if (!placeholder) {
        placeholder = document.createElement('i');
        placeholder.className = 'ph ph-image text-gray-400 text-xl';
        container.appendChild(placeholder);
      }
      placeholder.style.display = 'block';
    }
  }
}