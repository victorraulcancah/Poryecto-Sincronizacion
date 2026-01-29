// src\app\pages\dashboard\almacen\categorias\categorias-list.component.ts
import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule } from "@angular/router"
import { FormsModule } from '@angular/forms';
import { AlmacenService } from "../../../../services/almacen.service"
import { Categoria } from "../../../../types/almacen.types"
import { CategoriaModalComponent } from "./categoria-modal.component"
import { MigrarCategoriaModalComponent } from "../migrar-categoria-modal/migrar-categoria-modal.component"
import { SeccionFilterService } from '../../../../services/seccion-filter.service';
import { PermissionsService } from '../../../../services/permissions.service';
import Swal from "sweetalert2"

@Component({
  selector: "app-categorias-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CategoriaModalComponent,
    MigrarCategoriaModalComponent
  ],
  templateUrl: "./categorias-list.component.html",
  styleUrl: "./categorias-list.component.scss"
})
export class CategoriasListComponent implements OnInit, OnDestroy {
  // Datos
  categorias: Categoria[] = []
  categoriasFiltradas: Categoria[] = []
  isLoading = true
  categoriaSeleccionada: Categoria | null = null
  categoriaMigracion: Categoria | null = null

  // Paginación simple
  pageSize = 10;
  currentPage = 1;
  selected: Categoria[] = [];

  // Método para acceder a Math.min en el template
  Math = Math;

  constructor(
    private almacenService: AlmacenService,
    private seccionFilterService: SeccionFilterService,
    public permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarCategorias()

    // Suscribirse a cambios de sección
    this.seccionFilterService.seccionSeleccionada$.subscribe(seccionId => {
      this.cargarCategorias();
    });
  }

  cargarCategorias(): void {
    this.isLoading = true
    const seccionId = this.seccionFilterService.getSeccionSeleccionada();

    console.log('Cargando categorías con sección:', seccionId);

    this.almacenService.obtenerCategorias(seccionId || undefined).subscribe({
      next: (categorias) => {
        this.categorias = categorias
        this.categoriasFiltradas = [...this.categorias]
        this.isLoading = false
        console.log('Categorías cargadas:', categorias.length);
      },
      error: (error) => {
        console.error("Error al cargar categorías:", error)
        this.isLoading = false
      },
    })
  }

  nuevaCategoria(): void {
    this.categoriaSeleccionada = null
  }

  editarCategoria(categoria: Categoria): void {
    this.categoriaSeleccionada = categoria
    const modal = document.getElementById("modalCrearCategoria")
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal)
      bootstrapModal.show()
    }
  }

  eliminarCategoria(categoria: Categoria): void {
    Swal.fire({
      title: "¿Eliminar categoría?",
      html: `Estás a punto de eliminar la categoría <strong>"${categoria.nombre}"</strong>.<br>Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-12",
        confirmButton: "rounded-8",
        cancelButton: "rounded-8",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.almacenService.eliminarCategoria(categoria.id).subscribe({
          next: () => {
            Swal.fire({
              title: "¡Eliminada!",
              text: "La categoría ha sido eliminada exitosamente.",
              icon: "success",
              confirmButtonColor: "#198754",
              customClass: {
                popup: "rounded-12",
                confirmButton: "rounded-8",
              },
            })
            this.cargarCategorias()
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo eliminar la categoría. Inténtalo de nuevo.",
              icon: "error",
              confirmButtonColor: "#dc3545",
              customClass: {
                popup: "rounded-12",
                confirmButton: "rounded-8",
              },
            })
            console.error("Error al eliminar categoría:", error)
          },
        })
      }
    })
  }

  toggleEstado(categoria: Categoria): void {
    this.almacenService
      .toggleEstadoCategoria(categoria.id, !categoria.activo)
      .subscribe({
        next: () => {
          this.cargarCategorias()
        },
        error: (error) => {
          console.error("Error al actualizar estado de la categoría:", error)
        },
      })
  }

  onCategoriaGuardada(): void {
    this.cargarCategorias()
    this.categoriaSeleccionada = null

    // Actualizar totales en el componente padre
    const almacenComponent = document.querySelector('app-almacen') as any
    if (almacenComponent && almacenComponent.onDatosActualizados) {
      almacenComponent.onDatosActualizados()
    }
  }

  onModalCerrado(): void {
    this.categoriaSeleccionada = null
  }

  onImageError(event: any): void {
    console.error("Error al cargar imagen:", event)

    event.target.style.display = "none"
    event.target.classList.add("image-error")

    const container = event.target.closest(".image-container")
    if (container) {
      let placeholder = container.querySelector(".ph-image")
      if (!placeholder) {
        placeholder = document.createElement("i")
        placeholder.className = "ph ph-image text-gray-400"
        placeholder.style.fontSize = "16px"
        container.appendChild(placeholder)
      }
      placeholder.style.display = "block"
    }
  }

  migrarCategoria(categoria: Categoria): void {
    this.categoriaMigracion = categoria
    const modal = document.getElementById("modalMigrarCategoria")
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal)
      bootstrapModal.show()
    }
  }

  onCategoriaMigrada(): void {
    this.cargarCategorias()
    this.categoriaMigracion = null
  }

  onModalMigracionCerrado(): void {
    this.categoriaMigracion = null
  }

  // Métodos de paginación simple
  getPaginatedCategorias(): Categoria[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.categoriasFiltradas.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.categoriasFiltradas.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // Métodos de selección múltiple
  isSelected(categoria: Categoria): boolean {
    return this.selected.some(s => s.id === categoria.id);
  }

  isAllSelected(): boolean {
    return this.categoriasFiltradas.length > 0 &&
           this.categoriasFiltradas.every(categoria => this.isSelected(categoria));
  }

  toggleSelection(categoria: Categoria, event: any): void {
    if (event.target.checked) {
      if (!this.isSelected(categoria)) {
        this.selected.push(categoria);
      }
    } else {
      this.selected = this.selected.filter(s => s.id !== categoria.id);
    }
  }

  toggleAllSelection(event: any): void {
    if (event.target.checked) {
      this.categoriasFiltradas.forEach(categoria => {
        if (!this.isSelected(categoria)) {
          this.selected.push(categoria);
        }
      });
    } else {
      this.selected = [];
    }
  }

  eliminarSeleccionadas(): void {
    if (this.selected.length === 0) return;

    const nombres = this.selected.map(c => c.nombre).join(', ');

    Swal.fire({
      title: "¿Eliminar categorías seleccionadas?",
      html: `Estás a punto de eliminar ${this.selected.length} categoría${this.selected.length > 1 ? 's' : ''}: <strong>${nombres}</strong>.<br>Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-12",
        confirmButton: "rounded-8",
        cancelButton: "rounded-8",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Implementar eliminación múltiple aquí
        console.log('Eliminar categorías:', this.selected);
        this.selected = [];
        this.cargarCategorias();
      }
    });
  }

  get selectionText(): string {
    const total = this.categorias.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} categorías en total`;
    }
    return `${selected} seleccionada${selected > 1 ? 's' : ''} de ${total}`;
  }

  // Métodos de estadísticas
  getCategoriasActivas(): number {
    return this.categorias.filter(c => c.activo).length;
  }

  getCategoriasInactivas(): number {
    return this.categorias.filter(c => !c.activo).length;
  }

  // Método para obtener tiempo relativo
  getTimeAgo(fecha: string): string {
    const now = new Date();
    const date = new Date(fecha);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${diffDays} días`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return `Hace ${Math.floor(diffDays / 365)} años`;
  }

  // Método trackBy para optimizar renderizado
  trackByCategoriaId(index: number, categoria: Categoria): number {
    return categoria.id;
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }
}