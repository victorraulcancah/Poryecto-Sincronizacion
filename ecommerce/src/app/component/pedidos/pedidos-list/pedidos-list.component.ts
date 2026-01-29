import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../services/pedidos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./pedidos-list.component.html",
  styleUrl: "./pedidos-list.component.scss"
})
export class PedidosListComponent implements OnInit {
  // Datos
  cotizaciones: any[] = []; // Solo cotizaciones (que el admin ve como "pedidos")
  cotizacionesFiltradas: any[] = [];
  cotizacionSeleccionada: any | null = null;

  // Para cambio de estado
  estadosDisponibles: any[] = [];
  estadoSeleccionado: number | null = null;
  comentarioEstado: string = '';
  cambiandoEstado: boolean = false;
  loading = false;

  // Paginación simple
  pageSize = 10;
  currentPage = 1;

  // Método para acceder a Math.min en el template
  Math = Math;

  constructor(private pedidosService: PedidosService) {}

  ngOnInit(): void {
    this.cargarCotizaciones();
  }

  cargarCotizaciones(): void {
    this.loading = true;
    this.pedidosService.getAllCotizaciones().subscribe({
      next: (response) => {
        console.log('📦 Respuesta completa del servidor:', response);
        if (response.status === 'success') {
          this.cotizaciones = response.cotizaciones || [];
          this.cotizacionesFiltradas = [...this.cotizaciones];
          console.log('✅ Cotizaciones cargadas:', this.cotizaciones.length);
          console.log('📋 Datos cotizaciones:', this.cotizaciones);
        } else {
          console.log('⚠️ Respuesta no exitosa:', response);
          this.cotizaciones = [];
          this.cotizacionesFiltradas = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando cotizaciones:', error);
        this.cotizaciones = [];
        this.cotizacionesFiltradas = [];
        this.loading = false;
      }
    });
  }

  verDetalle(cotizacion: any): void {
    this.cotizacionSeleccionada = cotizacion;
    const modal = document.getElementById('detallePedidoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  contactarWhatsApp(cotizacion: any): void {
    const telefono = cotizacion.telefono_contacto || '';
    const codigo = cotizacion.codigo_cotizacion;
    const cliente = cotizacion.cliente_nombre;
    const total = cotizacion.total;

    // Mensaje personalizado para WhatsApp
    const mensaje = `Hola ${cliente}, te contactamos respecto a tu cotización ${codigo} por S/ ${total}. ¿En qué podemos ayudarte?`;

    // Formatear número de teléfono (quitar espacios, guiones, etc.)
    const telefonoLimpio = telefono.replace(/\D/g, '');

    // URL de WhatsApp
    const whatsappUrl = `https://wa.me/51${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;

    // Abrir en nueva ventana
    window.open(whatsappUrl, '_blank');
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  cambiarEstado(cotizacion: any): void {
    this.cotizacionSeleccionada = cotizacion;
    this.loadEstadosDisponibles(cotizacion.id);
    const modal = document.getElementById('cambiarEstadoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  imprimirPedido(): void {
    console.log('Imprimir cotización:', this.cotizacionSeleccionada?.codigo_cotizacion);
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'bg-secondary-50 text-secondary-600';
    
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'bg-warning-50 text-warning-600';
      case 'procesando':
        return 'bg-info-50 text-info-600';
      case 'enviado':
        return 'bg-primary-50 text-primary-600';
      case 'entregado':
        return 'bg-success-50 text-success-600';
      case 'cancelado':
        return 'bg-danger-50 text-danger-600';
      default:
        return 'bg-secondary-50 text-secondary-600';
    }
  }

  formatMetodoPago(metodo: string | null | undefined): string {
    if (!metodo) return 'No especificado';
    
    switch (metodo.toLowerCase()) {
      case 'efectivo':
        return 'Efectivo';
      case 'tarjeta':
        return 'Tarjeta de crédito/débito';
      case 'transferencia':
        return 'Transferencia bancaria';
      case 'yape':
        return 'Yape';
      case 'plin':
        return 'Plin';
      default:
        return metodo.charAt(0).toUpperCase() + metodo.slice(1);
    }
  }

  formatFormaEnvio(forma: string | null | undefined): string {
    if (!forma) return 'No especificada';
    
    switch (forma.toLowerCase()) {
      case 'delivery':
        return 'Delivery';
      case 'recojo_tienda':
        return 'Recojo en tienda';
      case 'envio_provincia':
        return 'Envío a provincia';
      default:
        return forma.replace('_', ' ').charAt(0).toUpperCase() + forma.slice(1);
    }
  }

  // Métodos para manejo de estados
  loadEstadosDisponibles(pedidoId: number): void {
    this.pedidosService.getEstados(pedidoId).subscribe({
      next: (response: any) => {
        this.estadosDisponibles = response.estados || response;
        console.log('Estados disponibles:', this.estadosDisponibles);
      },
      error: (error) => {
        console.error('Error cargando estados:', error);
      }
    });
  }

  confirmarCambioEstado(): void {
    if (!this.cotizacionSeleccionada || !this.estadoSeleccionado) {
      return;
    }

    this.cambiandoEstado = true;

    const data = {
      estado_cotizacion_id: this.estadoSeleccionado,
      comentario: this.comentarioEstado
    };

    this.pedidosService.cambiarEstadoCotizacion(this.cotizacionSeleccionada.id, data).subscribe({
      next: (response) => {
        console.log('Estado cambiado exitosamente:', response);

        // Actualizar la cotización en la lista
        const index = this.cotizaciones.findIndex((c: any) => c.id === this.cotizacionSeleccionada!.id);
        if (index !== -1) {
          this.cotizaciones[index] = { ...this.cotizaciones[index], ...response.cotizacion };
        }

        // Cerrar modal
        const modal = document.getElementById('cambiarEstadoModal');
        if (modal) {
          const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
          bootstrapModal?.hide();
        }

        // Limpiar form
        this.resetFormEstado();

        // Mostrar mensaje de éxito
        Swal.fire({
          title: '¡Éxito!',
          text: 'Estado del pedido actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        });
      },
      error: (error) => {
        console.error('Error cambiando estado:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al cambiar estado del pedido',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      },
      complete: () => {
        this.cambiandoEstado = false;
      }
    });
  }

  resetFormEstado(): void {
    this.estadoSeleccionado = null;
    this.comentarioEstado = '';
    this.estadosDisponibles = [];
    this.cambiandoEstado = false;
  }

  esEnvioAProvincia(cotizacion: any): boolean {
    return cotizacion.forma_envio === 'envio_provincia';
  }

  getEstadoBadgeClassExtended(estado: string | undefined): string {
    if (!estado) return 'bg-neutral-100 text-neutral-600';

    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'bg-warning-50 text-warning-600';
      case 'en revisión':
      case 'en revision':
        return 'bg-info-50 text-info-600';
      case 'confirmado':
        return 'bg-primary-50 text-primary-600';
      case 'en preparación':
      case 'en preparacion':
        return 'bg-main-50 text-main-600';
      case 'en recepción':
      case 'en recepcion':
        return 'bg-warning-100 text-warning-700';
      case 'enviado a provincia':
        return 'bg-tertiary-50 text-tertiary-600';
      case 'enviado':
        return 'bg-primary-100 text-primary-700';
      case 'entregado':
        return 'bg-success-50 text-success-600';
      case 'cancelado':
        return 'bg-danger-50 text-danger-600';
      case 'aprobada':
      case 'aprobado':
        return 'bg-success-100 text-success-700';
      case 'rechazada':
      case 'rechazado':
        return 'bg-danger-100 text-danger-700';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  }

  getEstadisticaEstado(estadoBuscado: string): number {
    if (!this.cotizaciones || this.cotizaciones.length === 0) return 0;

    return this.cotizaciones.filter((cotizacion: any) => {
      const estadoNombre = cotizacion.estado_cotizacion?.nombre?.toLowerCase() || '';
      return estadoNombre.includes(estadoBuscado.toLowerCase());
    }).length;
  }

  // Métodos de paginación moderna
  getPaginatedCotizaciones(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.cotizacionesFiltradas.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.cotizacionesFiltradas.length / this.pageSize);
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

  // Método trackBy para optimizar renderizado
  trackByCotizacionId(index: number, cotizacion: any): number {
    return cotizacion.id;
  }

  onPageSizeChange(): void {
    this.currentPage = 1; // Reset to first page when changing page size
  }
}