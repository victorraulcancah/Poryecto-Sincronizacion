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
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  pedidoSeleccionado: any | null = null;

  terminoBusqueda: string = '';
  filtroEstado: string = '';

  estadosDisponibles: any[] = [];
  estadoSeleccionado: number | null = null;
  comentarioEstado: string = '';
  cambiandoEstado: boolean = false;
  loading = false;

  pageSize = 10;
  currentPage = 1;

  Math = Math;

  constructor(private pedidosService: PedidosService) {}

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.loading = true;
    this.pedidosService.getPedidos().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.pedidos = response.pedidos || [];
          this.aplicarFiltros();
        } else {
          this.pedidos = [];
          this.pedidosFiltrados = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando pedidos:', error);
        this.pedidos = [];
        this.pedidosFiltrados = [];
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.pedidos];

    if (this.terminoBusqueda) {
      const term = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.codigo_pedido?.toLowerCase().includes(term) ||
        p.cliente_nombre?.toLowerCase().includes(term) ||
        p.cliente_email?.toLowerCase().includes(term)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter(p =>
        p.estado_pedido?.nombre?.toLowerCase().includes(this.filtroEstado.toLowerCase())
      );
    }

    this.pedidosFiltrados = resultado;
    this.currentPage = 1;
  }

  verDetalle(pedido: any): void {
    this.pedidoSeleccionado = pedido;
    const modal = document.getElementById('detallePedidoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  contactarWhatsApp(pedido: any): void {
    const telefono = pedido.telefono_contacto || '';
    const codigo = pedido.codigo_pedido;
    const cliente = pedido.cliente_nombre;
    const total = pedido.total;
    const mensaje = `Hola ${cliente}, te contactamos respecto a tu pedido ${codigo} por S/ ${total}. ¿En qué podemos ayudarte?`;
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/51${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  cambiarEstado(pedido: any): void {
    this.pedidoSeleccionado = pedido;
    this.loadEstadosDisponibles(pedido.id);
    const modal = document.getElementById('cambiarEstadoModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  imprimirPedido(): void {
    window.print();
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'bg-secondary-50 text-secondary-600';
    switch (estado.toLowerCase()) {
      case 'pendiente':        return 'bg-warning-50 text-warning-600';
      case 'confirmado':       return 'bg-primary-50 text-primary-600';
      case 'en preparación':
      case 'en preparacion':   return 'bg-info-50 text-info-600';
      case 'en recepción':
      case 'en recepcion':     return 'bg-warning-100 text-warning-700';
      case 'enviado':          return 'bg-primary-100 text-primary-700';
      case 'enviado a provincia': return 'bg-tertiary-50 text-tertiary-600';
      case 'entregado':        return 'bg-success-50 text-success-600';
      case 'cancelado':        return 'bg-danger-50 text-danger-600';
      default:                 return 'bg-secondary-50 text-secondary-600';
    }
  }

  formatMetodoPago(metodo: string | null | undefined): string {
    if (!metodo) return 'No especificado';
    switch (metodo.toLowerCase()) {
      case 'efectivo':       return 'Efectivo';
      case 'tarjeta':        return 'Tarjeta de crédito/débito';
      case 'transferencia':  return 'Transferencia bancaria';
      case 'yape':           return 'Yape';
      case 'plin':           return 'Plin';
      default: return metodo.charAt(0).toUpperCase() + metodo.slice(1);
    }
  }

  formatFormaEnvio(forma: string | null | undefined): string {
    if (!forma) return 'No especificada';
    switch (forma.toLowerCase()) {
      case 'delivery':         return 'Delivery';
      case 'recojo_tienda':    return 'Recojo en tienda';
      case 'envio_provincia':  return 'Envío a provincia';
      default: return forma.replace(/_/g, ' ').charAt(0).toUpperCase() + forma.slice(1);
    }
  }

  loadEstadosDisponibles(pedidoId: number): void {
    this.pedidosService.getEstados(pedidoId).subscribe({
      next: (response: any) => {
        this.estadosDisponibles = response.estados || response;
      },
      error: (error) => {
        console.error('Error cargando estados:', error);
      }
    });
  }

  confirmarCambioEstado(): void {
    if (!this.pedidoSeleccionado || !this.estadoSeleccionado) return;

    this.cambiandoEstado = true;

    this.pedidosService.cambiarEstado(this.pedidoSeleccionado.id, {
      estado_pedido_id: this.estadoSeleccionado,
      comentario: this.comentarioEstado
    }).subscribe({
      next: (response) => {
        const idx = this.pedidos.findIndex((p: any) => p.id === this.pedidoSeleccionado!.id);
        if (idx !== -1 && response.pedido) {
          this.pedidos[idx] = { ...this.pedidos[idx], ...response.pedido };
          this.aplicarFiltros();
        }

        const modal = document.getElementById('cambiarEstadoModal');
        if (modal) {
          (window as any).bootstrap.Modal.getInstance(modal)?.hide();
        }

        this.resetFormEstado();

        Swal.fire({
          title: '¡Éxito!',
          text: 'Estado del pedido actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        }).then(() => this.cargarPedidos());
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'Error al cambiar estado del pedido',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
        this.cambiandoEstado = false;
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

  esEnvioAProvincia(pedido: any): boolean {
    return pedido.forma_envio === 'envio_provincia';
  }

  getEstadisticaEstado(estadoBuscado: string): number {
    if (!this.pedidos || this.pedidos.length === 0) return 0;
    return this.pedidos.filter((p: any) => {
      const nombre = p.estado_pedido?.nombre?.toLowerCase() || '';
      return nombre.includes(estadoBuscado.toLowerCase());
    }).length;
  }

  getPaginatedPedidos(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.pedidosFiltrados.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.pedidosFiltrados.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }

    return pages;
  }

  trackByPedidoId(_index: number, pedido: any): number {
    return pedido.id;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }
}
