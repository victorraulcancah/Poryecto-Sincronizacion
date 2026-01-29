import { UsuariosService, Usuario as UsuarioBackend } from '../../../services/usuarios.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { UsuarioModalComponent } from '../usuario-modal/usuario-modal.component';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';
import { PermissionsService } from '../../../services/permissions.service';
import { Observable } from 'rxjs';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  estado: boolean;
  fechaCreacion: Date;
}

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UsuarioModalComponent],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss'
})

export class UsuariosListComponent implements OnInit {

  // Datos
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuariosBackend: any[] = [];
  loading = false;
  isLoading = false;

  // Paginación simple
  pageSize = 10;
  currentPage = 1;
  selected: Usuario[] = [];

  // Método para acceder a Math.min en el template
  Math = Math;

  // Modal properties
  showModal = false;
  selectedUsuarioId: number | null = null;
  modalMode: 'view' | 'edit' = 'view';
  canShowUser$!: Observable<boolean>;
  canEditUser$!: Observable<boolean>;
  canDeleteUser$!: Observable<boolean>;
  canCreateUser$!: Observable<boolean>;

constructor(
  private router: Router,
  private usuariosService: UsuariosService,
  private permissionsService: PermissionsService
) {}

ngOnInit(): void {
  this.cargarUsuarios();
  this.canShowUser$ = this.permissionsService.hasPermissionRealTime('usuarios.show');
  this.canEditUser$ = this.permissionsService.hasPermissionRealTime('usuarios.edit');
  this.canDeleteUser$ = this.permissionsService.hasPermissionRealTime('usuarios.delete');
  this.canCreateUser$ = this.permissionsService.hasPermissionRealTime('usuarios.create');
}

// Nuevo método para escuchar cambios de permisos
private setupPermissionListener(): void {
  window.addEventListener('permissions-updated', () => {
    // Refrescar permisos del usuario actual
    this.refreshUserPermissions();
  });
}

// Nuevo método para refrescar permisos
private refreshUserPermissions(): void {
  this.permissionsService.refreshPermissions().subscribe({
    next: (response) => {
      this.permissionsService.updatePermissions(response.permissions);
    },
    error: (error) => {
      console.error('Error al refrescar permisos:', error);
    }
  });
}


  private cargarUsuarios(): void {
    this.loading = true;
    this.isLoading = true;

    this.usuariosService.obtenerUsuarios().subscribe({
      next: (usuariosBackend: UsuarioBackend[]) => {
        this.usuariosBackend = usuariosBackend; // ← Guardar datos completos
        this.usuarios = usuariosBackend.map(usuario => ({
          id: usuario.id,
          nombre: usuario.name,
          email: usuario.email,
          rol: usuario.roles?.[0]?.name || 'Sin rol',
          estado: usuario.is_enabled || false,
          fechaCreacion: new Date(usuario.created_at)
        }));
        this.usuariosFiltrados = [...this.usuarios];
        this.loading = false;
        this.isLoading = false;
      },
      error: (error: any) => {
        Swal.fire({
          title: 'Error',
          text: 'Error al cargar usuarios',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        this.loading = false;
        this.isLoading = false;
      }
    });
  }

  onCrearUsuario(): void {
    this.router.navigate(['/dashboard/users/create']);
  }

    onVerUsuario(usuario: Usuario): void {
    this.selectedUsuarioId = usuario.id;
    this.modalMode = 'view';
    this.showModal = true;
  }

  onEditarUsuario(usuario: Usuario): void {
    this.selectedUsuarioId = usuario.id;
    this.modalMode = 'edit';
    this.showModal = true;
  }

  onEliminarUsuario(usuario: Usuario): void {
    // Eliminado: if (confirm(`¿Estás seguro de que deseas eliminar al usuario ${usuario.nombre}?`)) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar al usuario ${usuario.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuariosService.eliminarUsuario(usuario.id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El usuario ha sido eliminado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            this.cargarUsuarios(); // Recargar la lista
          },
          error: (error) => {
            // Eliminado: console.error('Error al eliminar usuario:', error);
            // Eliminado: alert('Error al eliminar el usuario');
            Swal.fire({
              title: 'Error',
              text: 'Error al eliminar el usuario',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }


  onCloseModal(): void {
    this.showModal = false;
    this.selectedUsuarioId = null;
  }

  onUsuarioActualizado(): void {
    this.cargarUsuarios(); // Recargar la lista cuando se actualice un usuario
  }

  // Método para obtener avatar o iniciales
  getAvatarDisplay(usuario: Usuario): { type: 'image' | 'initial', value: string, color?: string } {
    // Buscar en los datos del backend si hay avatar_url
    const usuarioBackend = this.usuariosBackend?.find(u => u.id === usuario.id);

    if (usuarioBackend?.profile?.avatar_url) {
      return {
        type: 'image',
        value: `${environment.baseUrl}${usuarioBackend.profile.avatar_url}`
      };
    }

    // Si no hay avatar, mostrar iniciales con color
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = usuario.nombre.charCodeAt(0) % colors.length;

    return {
      type: 'initial',
      value: usuario.nombre.charAt(0).toUpperCase(),
      color: colors[index]
    };
  }


  getRolClass(rol: string): string {
    switch (rol.toLowerCase()) {
      case 'administrador':
        return 'badge-admin';
       case 'asesor':
        return 'badge-vendedor';
       case 'soporte':
        return 'badge-cliente';
      default:
        return 'badge-default';
    }
  }


   trackByUsuarioId(index: number, usuario: Usuario): number {
    return usuario.id;
  }

   trackByUserId(index: number, usuario: Usuario): number {
    return usuario.id;
  }

  ngOnDestroy(): void {
    window.removeEventListener('permissions-updated', this.refreshUserPermissions);
  }

  // Agregar estos métodos al final de la clase UsuariosListComponent, antes del ngOnDestroy():

  canEditUser(): boolean {
    return this.permissionsService.hasPermission('usuarios.edit');
  }

  canDeleteUser(): boolean {
    return this.permissionsService.hasPermission('usuarios.delete');
  }

  // Método para cambiar estado del usuario
  onCambiarEstado(usuario: Usuario): void {
    const nuevoEstado = !usuario.estado;
    const accion = nuevoEstado ? 'habilitar' : 'deshabilitar';

    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas ${accion} al usuario ${usuario.nombre}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevoEstado ? '#059669' : '#dc2626'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuariosService.cambiarEstado(usuario.id, nuevoEstado).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Actualizado!',
              text: `El usuario ha sido ${nuevoEstado ? 'habilitado' : 'deshabilitado'} correctamente`,
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            this.cargarUsuarios(); // Recargar la lista
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'Error al cambiar el estado del usuario',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }

  getEstadoClass(estado: boolean): string {
    return estado ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600';
  }

  canChangeStatus(): boolean {
    return this.permissionsService.hasPermission('usuarios.edit');
  }

  // Métodos de paginación moderna
  getPaginatedUsuarios(): Usuario[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.usuariosFiltrados.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.usuariosFiltrados.length / this.pageSize);
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


  // Datatable methods
  get selectionText(): string {
    const count = this.selected.length;
    if (count === 0) {
      return `Mostrando ${this.usuarios.length} usuarios`;
    }
    return `${count} usuario${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'} de ${this.usuarios.length}`;
  }

  onSelect({ selected }: any): void {
    this.selected.splice(0, this.selected.length);
    this.selected.push(...selected);
  }

  onPageChange(event: any): void {
    console.log('Page change:', event);
  }

  displayCheck = (row: any, column?: any, value?: any) => {
    return true; // Permitir selección de todos los usuarios
  };

}