
// src/app/services/auth.service.ts
import { Injectable, PLATFORM_ID, Inject, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { User, AuthResponse, LoginRequest } from '../models/user.model';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PermissionsService } from './permissions.service';
import { CartService } from './cart.service'; // <-- IMPORTADO

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isBrowser: boolean;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private permissionsService!: PermissionsService;
  private cartService!: CartService; // <-- AÑADIDO

  private readonly tokenKey = 'auth_token';
  private readonly userKey = 'current_user';
  private readonly loginTimeKey = 'login_time';
  private readonly tokenExpirationHours = 12; // Duración del token en horas

  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Inyección manual para evitar dependencias circulares
    setTimeout(() => {
      this.permissionsService = this.injector.get(PermissionsService);
      this.cartService = this.injector.get(CartService); // <-- AÑADIDO
    }, 0);

    // Inicializar currentUserSubject con datos del localStorage de forma síncrona
    if (this.isBrowser) {
      const storedUser = localStorage.getItem(this.userKey);
      const storedToken = localStorage.getItem(this.tokenKey);

      // Solo cargar el usuario si también existe el token
      const user = (storedUser && storedToken) ? JSON.parse(storedUser) : null;
      this.currentUserSubject = new BehaviorSubject<User | null>(user);

      // console.log('🔧 AuthService inicializado con usuario:', user);
    } else {
      this.currentUserSubject = new BehaviorSubject<User | null>(null);
    }

    this.currentUser = this.currentUserSubject.asObservable();
  }


  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.status === 'success' && this.isBrowser) {
          this.storeAuthData(response);
        }
      }),
      // Sincronizar el carrito después de guardar los datos de autenticación
      switchMap(response => {
        if (response.status === 'success' && this.isBrowser) {
          return this.cartService.syncCart().pipe(
            tap(() => console.log('Sincronización de carrito completada tras login.')),
            catchError(err => {
              console.error('Fallo la sincronización del carrito, pero el login fue exitoso.', err);
              return of(response); // No detener el flujo de login por fallo en sync
            }),
            switchMap(() => of(response)) // Devolver la respuesta original del login
          );
        }
        return of(response);
      }),
      catchError(this.handleAuthError)
    );
  }

  private storeAuthData(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem('user_type', response.tipo_usuario); // Almacenar tipo de usuario

    // 🕐 Guardar hora de login para control de expiración
    localStorage.setItem(this.loginTimeKey, new Date().getTime().toString());

    const user: User = {
      id: response.user.id,
      name: response.user.name || response.user.nombre_completo,
      email: response.user.email,
      tipo_usuario: response.tipo_usuario,
      roles: Array.isArray(response.user.roles) ? response.user.roles : [],
      permissions: Array.isArray(response.user.permissions) ? response.user.permissions : [],
      email_verified_at: response.user.email_verified_at,
      // Campos específicos para motorizado
      motorizado_id: response.user.motorizado_id,
      username: response.user.username,
      numero_unidad: response.user.numero_unidad,
      estadisticas: response.user.estadisticas,
      // ✅ Incluir campo foto si existe
      foto: (response.user as any).foto
    };

    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUserSubject.next(user);

    // ✅ DESPUÉS del login, actualizar datos con información fresca del servidor
    setTimeout(() => {
      this.refreshUserData().subscribe({
        next: () => console.log('✅ Datos de usuario actualizados después del login'),
        error: (error) => console.warn('⚠️ No se pudieron actualizar datos post-login:', error)
      });
    }, 1000);

    // Configurar permisos según el tipo de usuario
    if (this.permissionsService) {
      if (response.tipo_usuario === 'admin') {
        this.permissionsService.setPermissions([...response.user.permissions]);
      } else if (response.tipo_usuario === 'motorizado') {
        this.permissionsService.setPermissions([...response.user.permissions]);
      }
    }

    // Redirigir según el tipo de usuario
    this.redirectAfterLogin(response.tipo_usuario);
  }

  logout(): Observable<any> {
    if (this.currentUserSubject.value) {
      return this.http.post<any>(`${environment.apiUrl}/logout`, {}).pipe(
        tap(() => this.clearSession()),
        catchError(() => {
          this.clearSession();
          return of({ status: 'success' });
        })
      );
    }
    this.clearSession();
    return of({ status: 'success' });
  }

  private clearSession(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem('user_type');
      localStorage.removeItem(this.loginTimeKey); // 🕐 Limpiar hora de login
    }
    this.currentUserSubject.next(null);

    // Redirigir según donde esté el usuario
    if (this.router.url.includes('/admin') || this.router.url.includes('/account') || this.router.url.includes('/motorizado')) {
        this.router.navigate(['/account']);
    }
  }

  // Método para redirigir después del login
  private redirectAfterLogin(tipoUsuario: string): void {
    switch(tipoUsuario) {
      case 'admin':
        this.router.navigate(['/dashboard']);
        break;
      case 'cliente':
        this.router.navigate(['/']);
        break;
      case 'motorizado':
        this.router.navigate(['/motorizado/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  private handleAuthError(error: HttpErrorResponse) {
    console.log('Error HTTP original:', error);
    return throwError(() => error);
  }

  // ... (resto de métodos como getToken, isLoggedIn, etc. sin cambios)
  getToken(): string | null {
    if (!this.isBrowser) return null; 
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * 🕐 Verificar si el token ha expirado (12 horas)
   */
  private isTokenExpired(): boolean {
    if (!this.isBrowser) return false;

    const loginTime = localStorage.getItem(this.loginTimeKey);
    if (!loginTime) return true; // Si no hay hora de login, considerar expirado

    const loginTimestamp = parseInt(loginTime, 10);
    const currentTimestamp = new Date().getTime();
    const hoursElapsed = (currentTimestamp - loginTimestamp) / (1000 * 60 * 60);

    return hoursElapsed >= this.tokenExpirationHours;
  }

  isLoggedIn(): boolean {
    const hasToken = !!this.getToken();
    const hasUser = !!this.currentUserSubject.value;

    // 🕐 Verificar si el token ha expirado
    if (hasToken && hasUser && this.isTokenExpired()) {
      console.log('⏰ Token expirado. Cerrando sesión automáticamente...');
      this.clearSession();
      return false;
    }

    return hasToken && hasUser;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Métodos para verificar tipo de usuario
  isAdmin(): boolean {
    return this.getCurrentUser()?.tipo_usuario === 'admin';
  }

  isCliente(): boolean {
    return this.getCurrentUser()?.tipo_usuario === 'cliente';
  }

  isMotorizado(): boolean {
    return this.getCurrentUser()?.tipo_usuario === 'motorizado';
  }

  getUserType(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('user_type');
  }

  getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }

  getUserProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/user`);
  }

  refreshPermissions(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/refresh-permissions`).pipe(
      tap((response: any) => {
        const currentUser = this.getCurrentUser();
        if (currentUser && response.permissions) {
          currentUser.permissions = response.permissions;
          localStorage.setItem('current_user', JSON.stringify(currentUser));
          this.currentUserSubject.next(currentUser);
        }
      })
    );
  }

  // Método para refrescar los datos del usuario
  refreshUserData(): Observable<any> {
    return this.getUserProfile().pipe(
      tap((response: any) => {
        if (response && response.user) {
          const updatedUser = response.user;
          // Mantener el tipo de usuario actual
          updatedUser.tipo_usuario = this.getCurrentUser()?.tipo_usuario;

          localStorage.setItem('current_user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      }),
      catchError(error => {
        console.error('Error al refrescar datos del usuario:', error);
        return throwError(() => error);
      })
    );
  }
  
  register(registerData: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/register`, registerData);
  }

  getDocumentTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/document-types`);
  }

  checkEmail(email: string): Observable<{exists: boolean, message: string}> {
    return this.http.post<{exists: boolean, message: string}>(`${environment.apiUrl}/check-email`, { email });
  }

  checkDocumento(numeroDocumento: string): Observable<{exists: boolean, message: string}> {
    return this.http.post<{exists: boolean, message: string}>(`${environment.apiUrl}/check-documento`, { numero_documento: numeroDocumento });
  }

  forgotPassword(email: string): Observable<{status: string, message: string}> {
    return this.http.post<{status: string, message: string}>(`${environment.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, email: string, password: string, passwordConfirmation: string): Observable<{status: string, message: string}> {
    return this.http.post<{status: string, message: string}>(`${environment.apiUrl}/reset-password`, { token, email, password, password_confirmation: passwordConfirmation });
  }

  verifyResetToken(token: string, email: string): Observable<{status: string, valid: boolean}> {
    return this.http.post<{status: string, valid: boolean}>(`${environment.apiUrl}/verify-reset-token`, { token, email });
  }

  verifyEmail(verificationData: {email: string, token: string}): Observable<{status: string, message: string}> {
    return this.http.post<{status: string, message: string}>(`${environment.apiUrl}/verify-email`, verificationData);
  }

  resendVerification(email: string): Observable<{status: string, message: string}> {
    return this.http.post<{status: string, message: string}>(`${environment.apiUrl}/resend-verification`, { email });
  }

  /**
   * Actualizar perfil del usuario
   */
  updateProfile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/user/update-profile`, formData).pipe(
      tap((response: any) => {
        if (response && response.user) {
          const updatedUser = response.user;
          updatedUser.tipo_usuario = this.getCurrentUser()?.tipo_usuario;
          localStorage.setItem('current_user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }

  /**
   * Cambiar contraseña del usuario
   */
  changePassword(passwordData: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/user/change-password`, passwordData);
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Superadmin tiene todos los permisos
    if (user.roles?.includes('superadmin')) {
      return true;
    }

    // Verificar si el usuario tiene el permiso
    return user.permissions?.includes(permission) || false;
  }

  /**
   * Procesar login con Google
   */
  processGoogleAuth(token: string, userData: string): void {
    console.log('🔧 processGoogleAuth iniciado');
    console.log('🔧 isBrowser:', this.isBrowser);
    
    if (!this.isBrowser) return;
    
    try {
      console.log('💾 Guardando token...');
      localStorage.setItem(this.tokenKey, token);
      console.log('✅ Token guardado');

      // 🕐 Guardar hora de login para control de expiración
      localStorage.setItem(this.loginTimeKey, new Date().getTime().toString());

      const googleUserData = JSON.parse(decodeURIComponent(userData));
      console.log('👤 Datos parseados:', googleUserData);

      // Crear objeto de usuario
      const user: User = {
        id: googleUserData.id,
        name: googleUserData.nombre_completo || (googleUserData.nombres + ' ' + googleUserData.apellidos),
        email: googleUserData.email,
        tipo_usuario: 'cliente',
        roles: googleUserData.roles || [],
        permissions: googleUserData.permissions || []
      };

      console.log('👤 Usuario creado:', user);

      // Guardar usuario
      localStorage.setItem(this.userKey, JSON.stringify(user));
      console.log('💾 Usuario guardado en localStorage');
      
      // CRÍTICO: Actualizar estado
      console.log('🔄 Actualizando currentUserSubject...');
      console.log('🔄 Valor anterior:', this.currentUserSubject.value);
      
      this.currentUserSubject.next(user);
      
      console.log('🔄 Valor después:', this.currentUserSubject.value);
      console.log('✅ Estado actualizado');

      // Verificar si el CartService está recibiendo el cambio
      setTimeout(() => {
        console.log('🕐 Verificación tardía - Usuario actual:', this.getCurrentUser());
      }, 100);
      
      // resto del código...
      
    } catch (error) {
      console.error('💥 ERROR en processGoogleAuth:', error);
      this.clearSession();
      throw error;
    }
  }
}
