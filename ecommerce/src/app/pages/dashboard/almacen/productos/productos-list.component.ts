// src\app\pages\dashboard\almacen\productos\productos-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlmacenService } from '../../../../services/almacen.service';
import { Producto } from '../../../../types/almacen.types';
import { ProductoModalComponent } from './producto-modal.component';
import { SeccionFilterService } from '../../../../services/seccion-filter.service';
import { PermissionsService } from '../../../../services/permissions.service';
import { SyncButtonComponent } from '../../../../components/sync-button/sync-button.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ProductoModalComponent,
    SyncButtonComponent
  ],
  templateUrl: "./productos-list.component.html",
  styleUrl: "./productos-list.component.scss"
})
export class ProductosListComponent implements OnInit, OnDestroy {
  // Datos
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  isLoading = true;
  productoSeleccionado: Producto | null = null;

  // ✅ NUEVAS PROPIEDADES PARA FILTROS
  categorias: any[] = [];
  marcas: any[] = [];
  filtroCategoria: number | null = null;
  filtroMarca: number | null = null;

  // ✅ NUEVO: Búsqueda de texto
  searchTerm: string = '';

  // Paginación simple
  pageSize = 10;
  currentPage = 1;
  selected: Producto[] = [];

  // Método para acceder a Math.min en el template
  Math = Math;

  constructor(
    private almacenService: AlmacenService,
    private seccionFilterService: SeccionFilterService,
    public permissionsService: PermissionsService
  ) { }

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarCategorias(); // ✅ NUEVO
    this.cargarMarcas(); // ✅ NUEVO

    // Suscribirse a cambios de sección
    this.seccionFilterService.seccionSeleccionada$.subscribe((seccionId) => {
      this.cargarProductos();
    });
  }

  // ✅ NUEVO: Cargar categorías
  cargarCategorias(): void {
    this.almacenService.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  // ✅ NUEVO: Cargar marcas
  cargarMarcas(): void {
    this.almacenService.obtenerMarcasPublicas().subscribe({
      next: (marcas) => {
        this.marcas = marcas;
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
      }
    });
  }

  // ✅ NUEVO: Aplicar filtros (incluye búsqueda de texto)
  aplicarFiltros(): void {
    this.productosFiltrados = this.productos.filter(producto => {
      let cumpleCategoria = true;
      let cumpleMarca = true;
      let cumpleBusqueda = true;

      // Filtro por categoría
      if (this.filtroCategoria !== null && this.filtroCategoria !== undefined) {
        cumpleCategoria = Number(producto.categoria_id) === Number(this.filtroCategoria);
      }

      // Filtro por marca
      if (this.filtroMarca !== null && this.filtroMarca !== undefined) {
        cumpleMarca = Number(producto.marca_id) === Number(this.filtroMarca);
      }

      // ✅ NUEVO: Filtro por búsqueda de texto
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const searchLower = this.searchTerm.toLowerCase().trim();
        cumpleBusqueda =
          producto.nombre.toLowerCase().includes(searchLower) ||
          producto.codigo_producto.toLowerCase().includes(searchLower) ||
          (producto.categoria?.nombre || '').toLowerCase().includes(searchLower) ||
          (producto.marca?.nombre || '').toLowerCase().includes(searchLower) ||
          (producto.descripcion || '').toLowerCase().includes(searchLower);
      }

      return cumpleCategoria && cumpleMarca && cumpleBusqueda;
    });

    // Resetear a la primera página
    this.currentPage = 1;
    console.log('✅ Filtros aplicados. Productos filtrados:', this.productosFiltrados.length);
  }

  // ✅ NUEVO: Limpiar filtros
  limpiarFiltros(): void {
    this.filtroCategoria = null;
    this.filtroMarca = null;
    this.searchTerm = '';
    this.productosFiltrados = [...this.productos];
    this.currentPage = 1;
  }

  // ✅ NUEVO: Método para manejar la búsqueda con debounce
  onSearchChange(): void {
    this.aplicarFiltros();
  }

  cargarProductos(): void {
    this.isLoading = true;
    const seccionId = this.seccionFilterService.getSeccionSeleccionada();

    console.log('Cargando productos con sección:', seccionId);

    this.almacenService.obtenerProductos(seccionId || undefined).subscribe({
      next: (productos) => {
        this.productos = productos;
        this.productosFiltrados = [...this.productos];
        this.isLoading = false;
        console.log('Productos cargados:', productos.length);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      },
    });
  }

  nuevoProducto(): void {
    this.productoSeleccionado = null;
  }

  editarProducto(producto: Producto): void {
    console.log('Editando producto:', producto);
    this.productoSeleccionado = { ...producto }; // Crear copia para evitar problemas de referencia

    // Esperar un tick antes de abrir el modal para asegurar que los datos se carguen
    setTimeout(() => {
      const modal = document.getElementById('modalCrearProducto');
      if (modal) {
        const bootstrapModal = new (window as any).bootstrap.Modal(modal);
        bootstrapModal.show();
      }
    }, 10);
  }

  eliminarProducto(producto: Producto): void {
    Swal.fire({
      title: '¿Eliminar producto?',
      html: `Estás a punto de eliminar el producto <strong>"${producto.nombre}"</strong>.<br>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-12',
        confirmButton: 'rounded-8',
        cancelButton: 'rounded-8',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.almacenService.eliminarProducto(producto.id).subscribe({
          next: () => {
            // ✅ OPTIMIZACIÓN: Eliminar solo del array local sin recargar
            this.productos = this.productos.filter(p => p.id !== producto.id);
            this.aplicarFiltros();
            console.log('✅ Producto eliminado de la lista:', producto.nombre);

            Swal.fire({
              title: '¡Eliminado!',
              text: 'El producto ha sido eliminado exitosamente.',
              icon: 'success',
              confirmButtonColor: '#198754',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el producto. Inténtalo de nuevo.',
              icon: 'error',
              confirmButtonColor: '#dc3545',
              customClass: {
                popup: 'rounded-12',
                confirmButton: 'rounded-8',
              },
            });
            console.error('Error al eliminar producto:', error);
          },
        });
      }
    });
  }

  toggleEstado(producto: Producto): void {
    this.almacenService
      .toggleEstadoProducto(producto.id, !producto.activo)
      .subscribe({
        next: () => {
          // ✅ OPTIMIZACIÓN: Actualizar solo el producto en el array local
          const index = this.productos.findIndex(p => p.id === producto.id);
          if (index !== -1) {
            this.productos[index].activo = !producto.activo;
            this.aplicarFiltros();
            console.log('✅ Estado actualizado:', this.productos[index].nombre, '→', this.productos[index].activo ? 'Activo' : 'Inactivo');
          }
        },
        error: (error) => {
          console.error('Error al actualizar estado del producto:', error);
        },
      });
  }

  onProductoGuardado(productoActualizado?: Producto): void {
    // ✅ OPTIMIZACIÓN: Actualizar solo el producto específico sin recargar todo
    if (productoActualizado) {
      if (this.productoSeleccionado) {
        // EDICIÓN: Actualizar producto existente en el array
        const index = this.productos.findIndex(p => p.id === productoActualizado.id);
        if (index !== -1) {
          this.productos[index] = productoActualizado;
          console.log('✅ Producto actualizado en la lista:', productoActualizado.nombre);
        }
      } else {
        // CREACIÓN: Agregar nuevo producto al inicio del array
        this.productos.unshift(productoActualizado);
        console.log('✅ Nuevo producto agregado a la lista:', productoActualizado.nombre);
      }

      // Actualizar productos filtrados
      this.aplicarFiltros();
    } else {
      // Fallback: Recargar todos si no se proporciona el producto
      this.cargarProductos();
    }

    this.productoSeleccionado = null;
  }

  onModalCerrado(): void {
    console.log('Modal cerrado - limpiando producto seleccionado');
    this.productoSeleccionado = null;
  }

  onImageError(event: any): void {
    console.error('Error al cargar imagen del producto:', event);
    event.target.style.display = 'none';
    event.target.classList.add('image-error');

    const container = event.target.closest('.image-container');
    if (container) {
      let placeholder = container.querySelector('.ph-package');
      if (!placeholder) {
        placeholder = document.createElement('i');
        placeholder.className = 'ph ph-package text-gray-400';
        placeholder.style.fontSize = '16px';
        container.appendChild(placeholder);
      }
      placeholder.style.display = 'block';
    }
  }
  toggleDestacado(producto: Producto): void {
    this.almacenService
      .toggleDestacadoProducto(producto.id, !producto.destacado)
      .subscribe({
        next: () => {
          // ✅ OPTIMIZACIÓN: Actualizar solo el producto en el array local
          const index = this.productos.findIndex(p => p.id === producto.id);
          if (index !== -1) {
            this.productos[index].destacado = !producto.destacado;
            this.aplicarFiltros();
            console.log('✅ Destacado actualizado:', this.productos[index].nombre, '→', this.productos[index].destacado ? 'Destacado' : 'Normal');
          }
        },
        error: (error) => {
          console.error('Error al actualizar estado destacado:', error);
        },
      });
  }

  // Métodos de paginación simple
  getPaginatedProductos(): Producto[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.productosFiltrados.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.productosFiltrados.length / this.pageSize);
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

  // Texto de selección
  get selectionText(): string {
    const total = this.productos.length;
    const selected = this.selected.length;
    if (selected === 0) {
      return `${total} productos en total`;
    }
    return `${selected} seleccionado${selected > 1 ? 's' : ''} de ${total}`;
  }

  // Métodos de estadísticas
  getProductosActivos(): number {
    return this.productos.filter(p => p.activo).length;
  }

  getProductosInactivos(): number {
    return this.productos.filter(p => !p.activo).length;
  }

  getProductosStockBajo(): number {
    return this.productos.filter(p => p.stock <= p.stock_minimo).length;
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
  trackByProductoId(index: number, producto: Producto): number {
    return producto.id;
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }
}