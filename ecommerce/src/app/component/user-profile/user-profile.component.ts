// src/app/component/user-profile/user-profile.component.ts
import {
  Component,
  OnInit,
  HostListener,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  isLoggedIn = false;
  esSuperadmin = false;
  esCliente = false;
  showAuthDropdown = false;
  showUserDropdown = false;
  isInitializing = true;
  isLoggingOut = false;

  // Variable pública para usar en el template
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // CRÍTICO: Solo ejecutar lógica de autenticación en el navegador
    if (!this.isBrowser) {
      // En el servidor, siempre mostrar estado "cargando"
      // Esto evita que se renderice el botón "Iniciar Sesión" en el servidor
      this.isInitializing = true;
      return;
    }

    // Solo ejecutar esto en el navegador - SÍNCRONAMENTE y UNA SOLA VEZ
    const token = this.authService.getToken();
    const currentUser = this.authService.getCurrentUser();

    // Guardar el ID del usuario actual para detectar cambios
    let previousUserId = currentUser?.id;

    // Inicializar estado una sola vez
    if (token && currentUser && Object.keys(currentUser).length > 0) {
      this.updateUserState(currentUser);
    } else {
      this.updateUserState(null);
    }

    // Suscribirse a cambios REALES de autenticación (login/logout)
    this.authService.currentUser.subscribe((user) => {
      const currentUserId = user?.id;

      // Solo actualizar si el usuario cambió (login/logout) o si pasó de null a usuario
      if (previousUserId !== currentUserId) {
        console.log('🔄 Cambio de usuario detectado:', { previousUserId, currentUserId });
        this.updateUserState(user);
        previousUserId = currentUserId;
      }
    });
  }

  private updateUserState(user: any): void {
    // console.log('🔧 Actualizando estado con usuario:', user);

    const hasValidToken = !!this.authService.getToken();

    // CRÍTICO: Validación exhaustiva
    const isValidUser =
      user &&
      typeof user === 'object' &&
      Object.keys(user).length > 0 &&
      user.id &&
      user.tipo_usuario;

    console.log('🔍 Validación:', {
      hasValidToken,
      isValidUser,
      userType: user?.tipo_usuario,
    });

    if (isValidUser && hasValidToken) {
      // Usuario válido con token
      this.user = user;
      this.isLoggedIn = true;

      // Determinar tipo de usuario
      this.esSuperadmin =
        user.roles?.includes('superadmin') ||
        user.roles?.includes('admin') ||
        user.tipo_usuario === 'admin';
      this.esCliente = user.tipo_usuario === 'cliente';
    } else {
      // Estado inválido - resetear TODO
      this.user = null;
      this.isLoggedIn = false;
      this.esSuperadmin = false;
      this.esCliente = false;
    }

    // Finalizar inicialización
    this.isInitializing = false;

    console.log('✅ Estado final:', {
      isLoggedIn: this.isLoggedIn,
      esCliente: this.esCliente,
      esSuperadmin: this.esSuperadmin,
      isInitializing: this.isInitializing,
      hasValidToken,
      userName: this.user?.name,
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Cerrar dropdowns al hacer click fuera
    this.showAuthDropdown = false;
    this.showUserDropdown = false;
  }

  logout(): void {
    // Evitar múltiples clics
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: () => {
        this.closeUserDropdown();
        this.isLoggingOut = false;
      },
      error: () => {
        this.isLoggingOut = false;
      }
    });
  }

  toggleAuthDropdown(event: Event): void {
    event.stopPropagation();
    this.showAuthDropdown = !this.showAuthDropdown;
    this.showUserDropdown = false; // Cerrar el otro dropdown
  }

  closeAuthDropdown(): void {
    this.showAuthDropdown = false;
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.showUserDropdown = !this.showUserDropdown;
    this.showAuthDropdown = false; // Cerrar el otro dropdown
  }

  closeUserDropdown(): void {
    this.showUserDropdown = false;
  }

  getCurrentState(): string {
    if (this.isInitializing) {
      console.log('🔄 User Profile State: LOADING');
      return 'loading';
    }

    if (this.isLoggedIn && this.user) {
      console.log('✅ User Profile State: LOGGED IN -', this.user.name);
      return 'logged';
    }

    console.log('👤 User Profile State: GUEST');
    return 'guest';
  }

  getDisplayName(): string {
    if (!this.user) return 'No Usuario';

    if (this.esCliente) {
      return this.user.name || 'Cliente';
    } else {
      // Es admin
      return this.esSuperadmin ? 'Super Admin' : 'Admin Usuario';
    }
  }
}
