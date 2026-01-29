import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BannerOfertaService, ProductoBannerOferta } from '../../../../services/banner-oferta.service';
import { ProductosService } from '../../../../services/productos.service';
import Swal from 'sweetalert2';

declare var bootstrap: any;

export interface ProductoDisponible {
  id: number;
  nombre: string;
  codigo: string;
  precio: number;
  stock: number;
  imagen_principal?: string;
}

@Component({
  selector: 'app-productos-banner-oferta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos-banner-oferta.component.html',
  styleUrl: './productos-banner-oferta.component.scss'
})
export class ProductosBannerOfertaComponent implements OnInit {
  @Input() bannerId!: number;

  productosEnBanner: ProductoBannerOferta[] = [];
  productosDisponibles: ProductoDisponible[] = [];

  isLoadingProductosBanner = false;
  isLoadingDisponibles = false;
  isAgregarSubmitting = false;

  // Para el modal de agregar
  productoSeleccionado: ProductoDisponible | null = null;
  descuentoPorcentaje: number = 0;
  buscarTermino: string = '';

  constructor(
    private bannerOfertaService: BannerOfertaService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    this.cargarProductosBanner();
  }

  cargarProductosBanner(): void {
    this.isLoadingProductosBanner = true;
    this.bannerOfertaService.getById(this.bannerId).subscribe({
      next: (banner) => {
        this.productosEnBanner = banner.productos || [];
        this.isLoadingProductosBanner = false;
      },
      error: (error: any) => {
        console.error('Error al cargar productos:', error);
        this.isLoadingProductosBanner = false;
      }
    });
  }

  abrirModalAgregar(): void {
    this.productoSeleccionado = null;
    this.descuentoPorcentaje = 0;
    this.buscarTermino = '';
    this.buscarProductos();
  }

  buscarProductos(): void {
    this.isLoadingDisponibles = true;
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productosDisponibles = productos
          .filter((p) => !this.productosEnBanner.find(pb => pb.id === p.id))
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo_producto,
            precio: p.precio_venta,
            stock: p.stock,
            imagen_principal: p.imagen_url || p.imagen || ''
          }));
        this.isLoadingDisponibles = false;
      },
      error: (error: any) => {
        console.error('Error al buscar productos:', error);
        this.isLoadingDisponibles = false;
      }
    });
  }

  get productosFiltrados(): ProductoDisponible[] {
    if (!this.buscarTermino) return this.productosDisponibles;

    const termino = this.buscarTermino.toLowerCase();
    return this.productosDisponibles.filter(p =>
      p.nombre.toLowerCase().includes(termino) ||
      p.codigo.toLowerCase().includes(termino)
    );
  }

  seleccionarProducto(producto: ProductoDisponible): void {
    this.productoSeleccionado = producto;
  }

  calcularPrecioConDescuento(precio: number): number {
    if (!this.descuentoPorcentaje) return precio;
    return precio - (precio * this.descuentoPorcentaje / 100);
  }

  agregarProducto(): void {
    if (!this.productoSeleccionado) {
      Swal.fire('Error', 'Debes seleccionar un producto', 'error');
      return;
    }

    if (!this.descuentoPorcentaje || this.descuentoPorcentaje <= 0 || this.descuentoPorcentaje > 100) {
      Swal.fire('Error', 'El descuento debe estar entre 1% y 100%', 'error');
      return;
    }

    this.isAgregarSubmitting = true;

    this.bannerOfertaService.agregarProductos(this.bannerId, [{
      producto_id: this.productoSeleccionado.id,
      descuento_porcentaje: this.descuentoPorcentaje
    }]).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Producto agregado al banner', 'success');
        this.cargarProductosBanner();
        this.cerrarModal();
        this.isAgregarSubmitting = false;
      },
      error: (error: any) => {
        console.error('Error al agregar producto:', error);
        Swal.fire('Error', 'No se pudo agregar el producto', 'error');
        this.isAgregarSubmitting = false;
      }
    });
  }

  quitarProducto(productoId: number): void {
    Swal.fire({
      title: '¿Quitar producto?',
      text: 'El producto se eliminará de este banner',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bannerOfertaService.quitarProducto(this.bannerId, productoId).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Producto quitado del banner', 'success');
            this.cargarProductosBanner();
          },
          error: (error: any) => {
            console.error('Error al quitar producto:', error);
            Swal.fire('Error', 'No se pudo quitar el producto', 'error');
          }
        });
      }
    });
  }

  actualizarDescuento(producto: ProductoBannerOferta): void {
    const descuentoActual = producto.descuento_porcentaje;

    Swal.fire({
      title: 'Actualizar descuento',
      html: `
        <input type="number" id="swal-input-descuento" class="swal2-input"
               value="${descuentoActual}" min="1" max="100" placeholder="Descuento %">
        <p class="text-sm text-gray-600 mt-2">Descuento actual: ${descuentoActual}%</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const input = document.getElementById('swal-input-descuento') as HTMLInputElement;
        const nuevoDescuento = parseFloat(input.value);

        if (!nuevoDescuento || nuevoDescuento <= 0 || nuevoDescuento > 100) {
          Swal.showValidationMessage('El descuento debe estar entre 1% y 100%');
          return false;
        }

        return nuevoDescuento;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.bannerOfertaService.actualizarDescuentoProducto(
          this.bannerId,
          producto.id,
          result.value
        ).subscribe({
          next: () => {
            Swal.fire('Actualizado', 'Descuento actualizado correctamente', 'success');
            this.cargarProductosBanner();
          },
          error: (error: any) => {
            console.error('Error al actualizar descuento:', error);
            Swal.fire('Error', 'No se pudo actualizar el descuento', 'error');
          }
        });
      }
    });
  }

  cerrarModal(): void {
    const modalElement = document.getElementById('modalAgregarProducto');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
    this.productoSeleccionado = null;
    this.descuentoPorcentaje = 0;
    this.buscarTermino = '';
  }
}
