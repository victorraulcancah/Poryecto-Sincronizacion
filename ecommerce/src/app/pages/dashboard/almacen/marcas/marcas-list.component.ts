// src\app\pages\dashboard\almacen\marcas\marcas-list.component.ts
import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule } from "@angular/router"
import { FormsModule } from '@angular/forms';
import { AlmacenService } from "../../../../services/almacen.service"
import { MarcaProducto } from "../../../../types/almacen.types"
import { SeccionFilterService } from '../../../../services/seccion-filter.service';
import { PermissionsService } from '../../../../services/permissions.service';
import { MarcaModalComponent } from "./marca-modal.component"
import Swal from "sweetalert2"

@Component({
  selector: "app-marcas-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MarcaModalComponent
  ],
  templateUrl: "./marcas-list.component.html",
  styleUrl: "./marcas-list.component.scss"
})
export class MarcasListComponent implements OnInit, OnDestroy {
  // Datos
  marcas: MarcaProducto[] = []
  marcasFiltradas: MarcaProducto[] = []
  isLoading = true
  marcaSeleccionada: MarcaProducto | null = null

  // Paginación simple
  pageSize = 10;
  currentPage = 1;
  selected: MarcaProducto[] = [];

  // Método para acceder a Math.min en el template
  Math = Math;

constructor(
    private almacenService: AlmacenService,
    private seccionFilterService: SeccionFilterService,
    public permissionsService: PermissionsService
  ) {}


ngOnInit(): void {
    this.cargarMarcas()

    // Suscribirse a cambios de sección
    this.seccionFilterService.seccionSeleccionada$.subscribe(seccionId => {
      this.cargarMarcas();
    });
  }


cargarMarcas(): void {
    this.isLoading = true
    const seccionId = this.seccionFilterService.getSeccionSeleccionada();

    console.log('Cargando marcas con sección:', seccionId);

    this.almacenService.obtenerMarcas(seccionId || undefined).subscribe({
      next: (marcas) => {
        this.marcas = marcas
        this.marcasFiltradas = [...this.marcas]
        this.isLoading = false
        console.log('Marcas cargadas:', marcas.length);
      },
      error: (error) => {
        console.error("Error al cargar marcas:", error)
        this.isLoading = false
      },
    })
  }

  nuevaMarca(): void {
    this.marcaSeleccionada = null
  }

  editarMarca(marca: MarcaProducto): void {
    this.marcaSeleccionada = marca
    const modal = document.getElementById("modalCrearMarca")
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal)
      bootstrapModal.show()
    }
  }

  eliminarMarca(marca: MarcaProducto): void {
    Swal.fire({
      title: "¿Eliminar marca?",
      html: `Estás a punto de eliminar la marca <strong>"${marca.nombre}"</strong>.<br>Esta acción no se puede deshacer.`,
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
        this.almacenService.eliminarMarca(marca.id).subscribe({
          next: () => {
            Swal.fire({
              title: "¡Eliminada!",
              text: "La marca ha sido eliminada exitosamente.",
              icon: "success",
              confirmButtonColor: "#198754",
              customClass: {
                popup: "rounded-12",
                confirmButton: "rounded-8",
              },
            })
            this.cargarMarcas()
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo eliminar la marca. Inténtalo de nuevo.",
              icon: "error",
              confirmButtonColor: "#dc3545",
              customClass: {
                popup: "rounded-12",
                confirmButton: "rounded-8",
              },
            })
            console.error("Error al eliminar marca:", error)
          },
        })
      }
    })
  }

  toggleEstado(marca: MarcaProducto): void {
    this.almacenService
      .toggleEstadoMarca(marca.id, !marca.activo)
      .subscribe({
        next: () => {
          this.cargarMarcas()
        },
        error: (error) => {
          console.error("Error al actualizar estado de la marca:", error)
        },
      })
  }

  onMarcaGuardada(): void {
    console.log('🔄 Recargando marcas después de guardar...');
    // Pequeño delay para asegurar que el backend procesó la imagen
    setTimeout(() => {
      this.cargarMarcas();
    }, 500);
    
    this.marcaSeleccionada = null;
    
    // Actualizar totales en el componente padre
    const almacenComponent = document.querySelector('app-almacen') as any;
    if (almacenComponent && almacenComponent.onDatosActualizados) {
      almacenComponent.onDatosActualizados();
    }
  }

  onModalCerrado(): void {
    this.marcaSeleccionada = null
  }

  onImageError(event: any): void {
    console.error("Error al cargar imagen:", event)

    event.target.style.display = "none"
    event.target.classList.add("image-error")

    const container = event.target.closest(".image-container")
    if (container) {
      let placeholder = container.querySelector(".ph-tag")
      if (!placeholder) {
        placeholder = document.createElement("i")
        placeholder.className = "ph ph-tag text-gray-400"
        placeholder.style.fontSize = "16px"
        container.appendChild(placeholder)
      }
      placeholder.style.display = "block"
    }
  }

  // Métodos de paginación simple
  getPaginatedMarcas(): MarcaProducto[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.marcasFiltradas.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.marcasFiltradas.length / this.pageSize);
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

  get selectionText(): string {
    const total = this.marcas.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} marcas en total`;
    }
    return `${selected} seleccionada${selected > 1 ? 's' : ''} de ${total}`;
  }

  // Métodos de estadísticas
  getMarcasActivas(): number {
    return this.marcas.filter(m => m.activo).length;
  }

  getMarcasInactivas(): number {
    return this.marcas.filter(m => !m.activo).length;
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
  trackByMarcaId(index: number, marca: MarcaProducto): number {
    return marca.id;
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }
}