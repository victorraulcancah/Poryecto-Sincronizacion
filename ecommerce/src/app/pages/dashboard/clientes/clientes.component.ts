// src\app\pages\dashboard\clientes\clientes.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { PermissionsService } from '../../../services/permissions.service';
import { Subject, takeUntil } from 'rxjs';
import {
  Cliente,
  ClientesFiltros,
  EstadisticasGenerales
} from '../../../models/cliente.model';
import { ClienteEditModalComponent } from '../../../components/cliente-edit-modal/cliente-edit-modal.component';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ClienteEditModalComponent
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  estadisticas: EstadisticasGenerales = {
    total_clientes: 0,
    clientes_activos: 0,
    clientes_nuevos: 0
  };

  // Estados de carga
  loading = false;
  loadingStats = false;

  // Filtros
  filtros: ClientesFiltros = {
    search: '',
    estado: '',
    tipo_login: '',
    per_page: 15,
    page: 1
  };

  // Paginación
  paginacion = {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0
  };

  // Permisos
  puedeVerDetalle = false;
  puedeEditar = false;
  puedeEliminar = false;

  // Modal
  mostrarModalEditar = false;
  clienteEditando: Cliente | null = null;

  // Tabla properties
  pageSize = 10;
  currentPage = 1;
  selected: Cliente[] = [];

  constructor(
    private clienteService: ClienteService,
    private permissionsService: PermissionsService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargarPermisos();
    this.cargarEstadisticas();
    this.cargarClientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarPermisos(): void {
    this.puedeVerDetalle = this.permissionsService.hasPermission('clientes.show');
    this.puedeEditar = this.permissionsService.hasPermission('clientes.edit');
    this.puedeEliminar = this.permissionsService.hasPermission('clientes.delete');
  }

  private cargarEstadisticas(): void {
    this.loadingStats = true;
    this.clienteService.getEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.estadisticas = response.data;
          }
          this.loadingStats = false;
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
          this.loadingStats = false;
        }
      });
  }

  cargarClientes(): void {
    this.loading = true;
    this.clienteService.getClientes(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.clientes = response.data.data;
            this.clientesFiltrados = [...this.clientes];
            this.paginacion = {
              current_page: response.data.current_page,
              last_page: response.data.last_page,
              per_page: response.data.per_page,
              total: response.data.total
            };
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar clientes:', error);
          this.loading = false;
        }
      });
  }

  buscar(): void {
    this.filtros.page = 1;
    this.cargarClientes();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      estado: '',
      tipo_login: '',
      per_page: 15,
      page: 1
    };
    this.cargarClientes();
  }

  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.paginacion.last_page) {
      this.filtros.page = page;
      this.cargarClientes();
    }
  }


  verDetalle(id: number): void {
    this.router.navigate(['/dashboard/clientes', id]);
  }

  editarCliente(cliente: Cliente): void {
    this.clienteEditando = { ...cliente };
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.clienteEditando = null;
  }

  onClienteActualizado(clienteActualizado: Cliente): void {
    const index = this.clientes.findIndex(c => c.id_cliente === clienteActualizado.id_cliente);
    if (index !== -1) {
      this.clientes[index] = clienteActualizado;
    }
    this.cerrarModalEditar();

    // Recargar toda la lista para asegurar que se obtengan las fotos actualizadas
    setTimeout(() => {
      this.cargarClientes();
      this.cargarEstadisticas(); // Recargar estadísticas por si cambió el estado
    }, 500);
  }

  toggleEstado(cliente: Cliente): void {
    const accion = cliente.estado ? 'desactivar' : 'activar';

    if (confirm(`¿Está seguro de ${accion} al cliente ${cliente.nombre_completo}?`)) {
      this.clienteService.toggleEstado(cliente.id_cliente)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              cliente.estado = !cliente.estado;
              this.cargarEstadisticas(); // Actualizar estadísticas
            }
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            alert('Error al cambiar el estado del cliente');
          }
        });
    }
  }

  eliminarCliente(cliente: Cliente): void {
    if (confirm(`¿Está seguro de eliminar al cliente ${cliente.nombre_completo}?\n\nEsta acción desactivará la cuenta permanentemente.`)) {
      this.clienteService.deleteCliente(cliente.id_cliente)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.cargarClientes();
              this.cargarEstadisticas();
            }
          },
          error: (error) => {
            console.error('Error al eliminar cliente:', error);
            alert('Error al eliminar el cliente');
          }
        });
    }
  }

  // Utilidades para el template
  getInitials(nombre: string): string {
    if (!nombre) return '?';
    const words = nombre.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.charAt(0).toUpperCase();
  }

  getTipoLoginClass(tipo: string): string {
    const classes = {
      'manual': 'bg-primary',
      'google': 'bg-danger',
      'facebook': 'bg-info'
    };
    return classes[tipo as keyof typeof classes] || 'bg-secondary';
  }

  getTipoLoginIcon(tipo: string): string {
    const icons = {
      'manual': 'ph ph-user',
      'google': 'ph ph-google-logo',
      'facebook': 'ph ph-facebook-logo'
    };
    return icons[tipo as keyof typeof icons] || 'ph ph-user';
  }

  getTipoLoginText(tipo: string): string {
    const texts = {
      'manual': 'Manual',
      'google': 'Google',
      'facebook': 'Facebook'
    };
    return texts[tipo as keyof typeof texts] || tipo;
  }

  formatDate(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

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

  // Método para obtener la URL completa de la foto de perfil
  getClientePhotoUrl(cliente: Cliente): string | null {
    if (!cliente.foto) {
      return null;
    }

    let finalUrl = cliente.foto;

    if (finalUrl.startsWith('http')) {
      finalUrl = finalUrl.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
      return finalUrl;
    }

    let photoPath = finalUrl;
    if (photoPath.includes('/storage/clientes//storage/clientes/')) {
      photoPath = photoPath.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
    }

    if (photoPath.split('/storage/clientes/').length > 2) {
      const parts = photoPath.split('/storage/clientes/');
      photoPath = '/storage/clientes/' + parts[parts.length - 1];
    }

    return `${environment.baseUrl}${photoPath}`;
  }

  // Método para manejar errores de imagen
  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  // Método para obtener avatar display
  getAvatarDisplay(cliente: Cliente): { type: 'initial' | 'image', value: string, color?: string } {
    const photoUrl = this.getClientePhotoUrl(cliente);

    if (photoUrl) {
      return { type: 'image', value: photoUrl };
    }

    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    const name = cliente.nombre_completo || (cliente.nombres + ' ' + cliente.apellidos);
    const colorIndex = (cliente.id_cliente || 0) % colors.length;

    return {
      type: 'initial',
      value: this.getInitials(name),
      color: colors[colorIndex]
    };
  }

  // Método para obtener la clase CSS del estado
  getEstadoClass(estado: boolean): string {
    return estado
      ? 'bg-success-50 text-success-600 border-success-100'
      : 'bg-danger-50 text-danger-600 border-danger-100';
  }

  // Verificar permisos para cambiar estado
  canChangeStatus(): boolean {
    return this.puedeEditar;
  }

  // Paginación simple
  getPaginatedClientes(): Cliente[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.clientesFiltrados.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.clientesFiltrados.length / this.pageSize);
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
  trackByClienteId(index: number, cliente: Cliente): number {
    return cliente.id_cliente;
  }

  // Método para acceder a Math.min en el template
  Math = Math;
}