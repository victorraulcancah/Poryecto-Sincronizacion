// src\app\pages\my-account\my-account.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { ModalFotoComponent } from '../../component/modal-foto/modal-foto.component';
import { BreadcrumbComponent } from 'src/app/component/breadcrumb/breadcrumb.component';
import { environment } from '../../../environments/environment';
import {
  ClientePortalService,
  TitularCheckout,
} from '../../services/cliente-portal.service';
@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, ModalFotoComponent, BreadcrumbComponent],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.scss'
})
export class MyAccountComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading: boolean = true;
  showModalFoto: boolean = false;
  private destroy$ = new Subject<void>();
  private photoUrlCache: string | null = null;

  /** Cliente de 7Power al que está vinculada la cuenta (null si no lo está). */
  titular: TitularCheckout | null = null;

  constructor(
    public authService: AuthService, // ✅ Hacer público para usar en template
    private router: Router,
    private clientePortalService: ClientePortalService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.cargarTitular();
  }

  /**
   * Datos de la empresa o persona a nombre de quien se factura. Solo salen si
   * la cuenta está vinculada a un cliente del ERP.
   */
  private cargarTitular(): void {
    this.clientePortalService
      .getTitular()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => (this.titular = res?.vinculado ? res : null),
        // Si falla la consulta, la tarjeta se queda como estaba.
        error: () => (this.titular = null),
      });
  }

  /** RUC para empresas, DNI para personas. */
  get etiquetaDocumento(): string {
    return this.titular?.es_empresa ? 'RUC' : 'DNI';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData(): void {
    // Verificar si el usuario está logueado
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/account']);
      return;
    }

    // Suscribirse a los cambios del usuario actual
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoading = false;

          // Si no hay usuario, redirigir al login
          if (!user) {
            this.router.navigate(['/account']);
          }
        },
        error: (error) => {
          console.error('Error al cargar datos del usuario:', error);
          this.isLoading = false;
          this.router.navigate(['/account']);
        }
      });
  }


  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/account']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Aún así redirigir al login
        this.router.navigate(['/account']);
      }
    });
  }

  // Métodos auxiliares para obtener información del usuario
  getUserName(): string {
    // Con la cuenta vinculada manda el cliente de 7Power: es a nombre de quien
    // se emiten los comprobantes, así que es el dato que el cliente espera ver.
    if (this.titular?.nombre) return this.titular.nombre;

    if (!this.currentUser) return 'Usuario';
    
    // Si es un cliente e-commerce, extraer solo los nombres
    if (this.currentUser.tipo_usuario === 'cliente') {
      // Si existe name (que viene como nombre_completo), extraer solo los nombres
      if (this.currentUser.name) {
        const nombres = this.currentUser.name.split(' ');
        // Tomar solo las primeras dos palabras (nombres)
        return nombres.slice(0, 2).join(' ');
      }
      return 'Cliente';
    }
    
    // Si es admin, usar name completo
    return this.currentUser.name || 'Usuario';
  }

  getUserEmail(): string {
    // El correo del cliente vinculado si lo tiene registrado en 7Power.
    if (this.titular?.email) return this.titular.email;

    return this.currentUser?.email || '';
  }

  getUserType(): string {
    if (this.currentUser?.tipo_usuario === 'cliente') {
      return 'Cliente Verificado';
    } else if (this.currentUser?.tipo_usuario === 'admin') {
      return 'Administrador';
    }
    return 'Usuario';
  }

  getUserTypeClass(): string {
    if (this.currentUser?.tipo_usuario === 'cliente') {
      return 'bg-main-50 text-main-600';
    } else if (this.currentUser?.tipo_usuario === 'admin') {
      return 'bg-success-50 text-success-600';
    }
    return 'bg-gray-50 text-gray-600';
  }

  // Método para obtener las iniciales del usuario para el avatar
  getUserInitials(): string {
    const name = this.getUserName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Método para obtener la URL de la foto de perfil
  getUserPhotoUrl(): string | null {
    if (this.photoUrlCache !== null) {
      return this.photoUrlCache;
    }

    if (this.currentUser?.tipo_usuario === 'cliente') {
      const userAny = this.currentUser as any;
      const photoField = this.currentUser.foto || userAny.foto_url || userAny.profile_photo || userAny.avatar;

      if (photoField) {
        let finalUrl = photoField;

        // Verificar si ya es una URL completa
        if (finalUrl.startsWith('http')) {
          finalUrl = finalUrl.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
        } else {
          // Construir URL completa
          let photoPath = finalUrl;
          if (photoPath.includes('/storage/clientes//storage/clientes/')) {
            photoPath = photoPath.replace('/storage/clientes//storage/clientes/', '/storage/clientes/');
          }

          // Asegurar que la ruta comience con /
          if (!photoPath.startsWith('/')) {
            photoPath = '/' + photoPath;
          }

          finalUrl = `${environment.baseUrl}${photoPath}`;
        }

        // NO agregar token para imágenes públicas
        // Las imágenes en /storage/ son públicas y no necesitan token

        this.photoUrlCache = finalUrl;
        return finalUrl;
      }
    }

    this.photoUrlCache = null;
    return null;
  }

  // Método para manejar errores de imagen
  onImageError(event: any): void {
    // Ocultar la imagen con error
    event.target.style.display = 'none';

    // Limpiar cache para intentar recargar en el siguiente acceso
    this.photoUrlCache = null;
  }

  // Método para abrir modal de foto
  abrirModalFoto(): void {
    this.showModalFoto = true;
  }

  // Método para cerrar modal de foto
  cerrarModalFoto(): void {
    this.showModalFoto = false;
  }

  // Método para actualizar foto de perfil
  onFotoActualizada(): void {
    this.cerrarModalFoto();

    // Limpiar cache de foto
    this.photoUrlCache = null;

    // Forzar recarga de datos con un pequeño delay para asegurar que el backend se haya actualizado
    setTimeout(() => {
      this.authService.refreshUserData().subscribe({
        next: () => {
          this.loadUserData();
        },
        error: (error) => {
          this.loadUserData();
        }
      });
    }, 500);
  }

  // Método para debug - forzar recarga manual
  debugReloadUserData(): void {
    console.log('🔄 Forzando recarga de datos del usuario...');
    this.photoUrlCache = null;
    this.authService.refreshUserData().subscribe({
      next: (response) => {
        console.log('✅ Datos actualizados:', response);
        this.loadUserData();
      },
      error: (error) => {
        console.error('❌ Error al actualizar datos:', error);
      }
    });
  }
}