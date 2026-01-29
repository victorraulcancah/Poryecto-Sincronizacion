import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pedidos-asignados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./pedidos-asignados.component.html",
  styleUrl: "./pedidos-asignados.component.scss"
})
export class PedidosAsignadosComponent implements OnInit {
  filtroEstado = '';
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  contadores = { asignado: 0, aceptado: 0, en_camino: 0 };

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    // Datos de ejemplo - aquí se haría la llamada al backend
    this.pedidos = [
      {
        id: 1,
        numero: 'PED-001',
        estado: 'asignado',
        fecha_asignacion: new Date(),
        cliente: {
          nombre: 'Juan Pérez',
          telefono: '987654321'
        },
        direccion: 'Av. Arequipa 1234, Miraflores',
        total: 45.50,
        productos: [
          { nombre: 'Producto 1', cantidad: 2 },
          { nombre: 'Producto 2', cantidad: 1 }
        ],
        metodo_pago: 'Efectivo',
        latitud: -12.0464,
        longitud: -77.0428
      },
      {
        id: 2,
        numero: 'PED-002',
        estado: 'aceptado',
        fecha_asignacion: new Date(),
        cliente: {
          nombre: 'María García',
          telefono: '987654322'
        },
        direccion: 'Jr. de la Unión 500, Lima Centro',
        total: 32.00,
        productos: [
          { nombre: 'Producto A', cantidad: 1 }
        ],
        metodo_pago: 'Tarjeta',
        latitud: -12.0464,
        longitud: -77.0428
      }
    ];

    this.calcularContadores();
    this.filtrarPedidos();
  }

  calcularContadores(): void {
    this.contadores = {
      asignado: this.pedidos.filter(p => p.estado === 'asignado').length,
      aceptado: this.pedidos.filter(p => p.estado === 'aceptado').length,
      en_camino: this.pedidos.filter(p => p.estado === 'en_camino').length
    };
  }

  filtrarPedidos(): void {
    if (this.filtroEstado) {
      this.pedidosFiltrados = this.pedidos.filter(p => p.estado === this.filtroEstado);
    } else {
      this.pedidosFiltrados = [...this.pedidos];
    }
  }

  getEstadoLabel(estado: string): string {
    const labels: any = {
      'asignado': 'Asignado',
      'aceptado': 'Aceptado',
      'en_camino': 'En camino',
      'entregado': 'Entregado'
    };
    return labels[estado] || estado;
  }

  aceptarPedido(id: number): void {
    // Implementar llamada al backend
    console.log('Aceptar pedido:', id);
  }

  rechazarPedido(id: number): void {
    // Implementar llamada al backend
    console.log('Rechazar pedido:', id);
  }

  iniciarRuta(id: number): void {
    // Implementar llamada al backend
    console.log('Iniciar ruta:', id);
  }

  completarEntrega(id: number): void {
    // Implementar llamada al backend
    console.log('Completar entrega:', id);
  }

  verDetalles(id: number): void {
    // Implementar navegación a detalles
    console.log('Ver detalles:', id);
  }

  llamarCliente(telefono: string): void {
    window.open(`tel:${telefono}`, '_self');
  }

  abrirMapa(lat: number, lng: number): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }

  // Métodos nuevos para el template mejorado
  setFiltro(estado: string): void {
    this.filtroEstado = this.filtroEstado === estado ? '' : estado;
    this.filtrarPedidos();
  }

  getProgressPercent(estado: string): number {
    const total = this.pedidos.length;
    if (total === 0) return 0;

    const count = this.contadores[estado as keyof typeof this.contadores] || 0;
    return Math.round((count / total) * 100);
  }

  getTiempoPromedio(): string {
    // Cálculo simulado del tiempo promedio
    return '25 min';
  }

  getTimeAgo(fecha: Date): string {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();

    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));

    if (minutos < 1) {
      return 'Ahora mismo';
    } else if (minutos < 60) {
      return `Hace ${minutos} min`;
    } else {
      return `Hace ${horas}h`;
    }
  }

  getEstadoIcon(estado: string): string {
    const icons: { [key: string]: string } = {
      'asignado': 'ph ph-clock',
      'aceptado': 'ph ph-check',
      'en_camino': 'ph ph-truck',
      'entregado': 'ph ph-check-circle'
    };
    return icons[estado] || 'ph ph-package';
  }

  getEstadoIconClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'asignado': 'bg-warning-600',
      'aceptado': 'bg-success-600',
      'en_camino': 'bg-main-600',
      'entregado': 'bg-success-600'
    };
    return classes[estado] || 'bg-gray-600';
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'asignado': 'bg-warning-50 text-warning-600',
      'aceptado': 'bg-success-50 text-success-600',
      'en_camino': 'bg-main-50 text-main-600',
      'entregado': 'bg-success-50 text-success-600'
    };
    return classes[estado] || 'bg-gray-50 text-gray-600';
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtrarPedidos();
  }

  actualizarPedidos(): void {
    // Simular actualización
    this.cargarPedidos();
  }
}