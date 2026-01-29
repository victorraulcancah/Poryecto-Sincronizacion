// src/app/services/cookie-consent.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

// Interfaces
export interface CookiePreferences {
  cookies_necesarias: boolean;
  cookies_analiticas: boolean;
  cookies_marketing: boolean;
  cookies_funcionales: boolean;
  consintio_todo: boolean;
  rechazo_todo: boolean;
  personalizado: boolean;
  fecha_consentimiento?: string;
  fecha_expiracion?: string;
  version_politica?: string;
}

export interface CookieConfig {
  banner_activo: boolean;
  banner_posicion: string;
  banner_tema: string;
  banner_titulo: string;
  banner_mensaje: string;
  banner_boton_aceptar: string;
  banner_boton_rechazar: string;
  banner_boton_personalizar: string;
  banner_link_politica: string;
  categoria_necesarias_desc: string;
  categoria_analiticas_desc: string;
  categoria_marketing_desc: string;
  categoria_funcionales_desc: string;
  mostrar_icono_flotante: boolean;
  icono_flotante_posicion: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private apiUrl = `${environment.apiUrl}/cookies`;
  private isBrowser: boolean;
  private readonly STORAGE_KEY = 'cookie_preferences';
  private readonly SESSION_KEY = 'session_id';

  // BehaviorSubject para estado de preferencias
  private preferencesSubject = new BehaviorSubject<CookiePreferences | null>(null);
  public preferences$ = this.preferencesSubject.asObservable();

  // BehaviorSubject para estado del banner (visible/oculto)
  private bannerVisibleSubject = new BehaviorSubject<boolean>(false);
  public bannerVisible$ = this.bannerVisibleSubject.asObservable();

  // BehaviorSubject para configuración del banner
  private configSubject = new BehaviorSubject<CookieConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Inicializar el servicio de cookies
   * Debe llamarse en AppComponent.ngOnInit()
   */
  initialize(): Observable<void> {
    if (!this.isBrowser) {
      return of(undefined);
    }

    // Cargar configuración del banner
    return this.loadConfig().pipe(
      tap(() => {
        // Cargar preferencias guardadas
        const savedPreferences = this.loadFromLocalStorage();

        if (savedPreferences) {
          // Ya tiene preferencias guardadas
          this.preferencesSubject.next(savedPreferences);
          this.bannerVisibleSubject.next(false);
          this.applyConsent(savedPreferences);
        } else {
          // No tiene preferencias, mostrar banner
          this.bannerVisibleSubject.next(true);
        }
      }),
      map(() => undefined)
    );
  }

  /**
   * Cargar configuración pública del banner desde el backend
   */
  private loadConfig(): Observable<CookieConfig> {
    return this.http.get<{ success: boolean; data: CookieConfig }>(
      `${this.apiUrl}/configuracion/publica`
    ).pipe(
      map(response => response.data),
      tap(config => this.configSubject.next(config)),
      catchError(() => {
        // Configuración por defecto si falla
        const defaultConfig: CookieConfig = {
          banner_activo: true,
          banner_posicion: 'bottom',
          banner_tema: 'light',
          banner_titulo: 'Valoramos tu privacidad',
          banner_mensaje: 'Usamos cookies para mejorar su experiencia de navegación, mostrarle anuncios o contenidos personalizados y analizar nuestro tráfico. Al hacer clic en "Aceptar todo" usted da su consentimiento a nuestro uso de las cookies.',
          banner_boton_aceptar: 'Aceptar todo',
          banner_boton_rechazar: 'Rechazar todo',
          banner_boton_personalizar: 'Personalizar',
          banner_link_politica: 'Política de cookies',
          categoria_necesarias_desc: 'Estas cookies son esenciales para el funcionamiento del sitio web.',
          categoria_analiticas_desc: 'Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web.',
          categoria_marketing_desc: 'Se utilizan para rastrear a los visitantes con el fin de mostrar anuncios relevantes.',
          categoria_funcionales_desc: 'Permiten que el sitio web proporcione funcionalidad y personalización mejoradas.',
          mostrar_icono_flotante: true,
          icono_flotante_posicion: 'bottom-left'
        };
        this.configSubject.next(defaultConfig);
        return of(defaultConfig);
      })
    );
  }

  /**
   * Aceptar todas las cookies
   */
  acceptAll(): Observable<any> {
    const preferences: CookiePreferences = {
      cookies_necesarias: true,
      cookies_analiticas: true,
      cookies_marketing: true,
      cookies_funcionales: true,
      consintio_todo: true,
      rechazo_todo: false,
      personalizado: false
    };

    return this.savePreferences(preferences, '/aceptar-todo');
  }

  /**
   * Rechazar todas las cookies opcionales
   */
  rejectAll(): Observable<any> {
    const preferences: CookiePreferences = {
      cookies_necesarias: true,
      cookies_analiticas: false,
      cookies_marketing: false,
      cookies_funcionales: false,
      consintio_todo: false,
      rechazo_todo: true,
      personalizado: false
    };

    return this.savePreferences(preferences, '/rechazar-todo');
  }

  /**
   * Guardar preferencias personalizadas
   */
  saveCustomPreferences(preferences: Partial<CookiePreferences>): Observable<any> {
    const fullPreferences: CookiePreferences = {
      cookies_necesarias: true, // Siempre activadas
      cookies_analiticas: preferences.cookies_analiticas ?? false,
      cookies_marketing: preferences.cookies_marketing ?? false,
      cookies_funcionales: preferences.cookies_funcionales ?? false,
      consintio_todo: false,
      rechazo_todo: false,
      personalizado: true
    };

    return this.savePreferences(fullPreferences, '/preferencias');
  }

  /**
   * Guardar preferencias (método privado común)
   */
  private savePreferences(preferences: CookiePreferences, endpoint: string): Observable<any> {
    const sessionId = this.getOrCreateSessionId();

    const payload = {
      ...preferences,
      session_id: sessionId,
      url_origen: this.isBrowser ? window.location.href : ''
    };

    return this.http.post(`${this.apiUrl}${endpoint}`, payload).pipe(
      tap(() => {
        // Guardar en localStorage
        this.saveToLocalStorage(preferences);

        // Actualizar estado
        this.preferencesSubject.next(preferences);
        this.bannerVisibleSubject.next(false);

        // Aplicar consentimiento (activar/desactivar scripts)
        this.applyConsent(preferences);
      }),
      catchError(error => {
        console.error('Error al guardar preferencias de cookies:', error);
        // Aunque falle el backend, guardar localmente
        this.saveToLocalStorage(preferences);
        this.preferencesSubject.next(preferences);
        this.bannerVisibleSubject.next(false);
        this.applyConsent(preferences);
        return of({ success: true, message: 'Guardado localmente' });
      })
    );
  }

  /**
   * Aplicar consentimiento (activar/desactivar scripts según preferencias)
   */
  private applyConsent(preferences: CookiePreferences): void {
    if (!this.isBrowser) return;

    // Google Analytics
    if (preferences.cookies_analiticas) {
      this.enableGoogleAnalytics();
    } else {
      this.disableGoogleAnalytics();
    }

    // Facebook Pixel (Marketing)
    if (preferences.cookies_marketing) {
      this.enableFacebookPixel();
    } else {
      this.disableFacebookPixel();
    }

    // Cookies funcionales (preferencias de idioma, tema, etc.)
    if (preferences.cookies_funcionales) {
      this.enableFunctionalCookies();
    } else {
      this.disableFunctionalCookies();
    }

    // Emitir evento personalizado para que otros componentes sepan
    if (this.isBrowser) {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated', {
        detail: preferences
      }));
    }
  }

  /**
   * Revocar consentimiento
   */
  revokeConsent(): Observable<any> {
    const sessionId = this.getOrCreateSessionId();

    return this.http.delete(`${this.apiUrl}/revocar`, {
      body: { session_id: sessionId }
    }).pipe(
      tap(() => {
        this.clearLocalStorage();
        this.preferencesSubject.next(null);
        this.bannerVisibleSubject.next(true);
        this.removeAllCookies();
      }),
      catchError(error => {
        console.error('Error al revocar consentimiento:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Mostrar/ocultar banner manualmente
   */
  showBanner(): void {
    this.bannerVisibleSubject.next(true);
  }

  hideBanner(): void {
    this.bannerVisibleSubject.next(false);
  }

  /**
   * Obtener preferencias actuales
   */
  getCurrentPreferences(): CookiePreferences | null {
    return this.preferencesSubject.value;
  }

  /**
   * Verificar si tiene consentimiento para una categoría específica
   */
  hasConsent(category: 'necesarias' | 'analiticas' | 'marketing' | 'funcionales'): boolean {
    const preferences = this.getCurrentPreferences();
    if (!preferences) return false;

    const key = `cookies_${category}` as keyof CookiePreferences;
    return Boolean(preferences[key]);
  }

  // =========================================
  // MÉTODOS PRIVADOS - LocalStorage
  // =========================================

  private saveToLocalStorage(preferences: CookiePreferences): void {
    if (!this.isBrowser) return;

    try {
      const data = {
        ...preferences,
        fecha_consentimiento: new Date().toISOString(),
        fecha_expiracion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
    }
  }

  private loadFromLocalStorage(): CookiePreferences | null {
    if (!this.isBrowser) return null;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;

      const preferences = JSON.parse(data);

      // Verificar si expiró (después de 365 días)
      if (preferences.fecha_expiracion) {
        const expiration = new Date(preferences.fecha_expiracion);
        if (expiration < new Date()) {
          this.clearLocalStorage();
          return null;
        }
      }

      return preferences;
    } catch (error) {
      console.error('Error al cargar de localStorage:', error);
      return null;
    }
  }

  private clearLocalStorage(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
    }
  }

  private getOrCreateSessionId(): string {
    if (!this.isBrowser) return this.generateSessionId();

    try {
      let sessionId = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionId) {
        sessionId = this.generateSessionId();
        sessionStorage.setItem(this.SESSION_KEY, sessionId);
      }
      return sessionId;
    } catch (error) {
      return this.generateSessionId();
    }
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // =========================================
  // MÉTODOS PRIVADOS - Gestión de Scripts
  // =========================================

  private enableGoogleAnalytics(): void {
    if (!this.isBrowser) return;

    // Obtener GA ID de la configuración
    const config = this.configSubject.value;
    const gaId = config?.['google_analytics_id'];

    if (gaId && config?.['google_analytics_activo']) {
      // Activar Google Analytics
      (window as any).gtag?.('consent', 'update', {
        'analytics_storage': 'granted'
      });

      console.log('Google Analytics activado');
    }
  }

  private disableGoogleAnalytics(): void {
    if (!this.isBrowser) return;

    (window as any).gtag?.('consent', 'update', {
      'analytics_storage': 'denied'
    });

    console.log('Google Analytics desactivado');
  }

  private enableFacebookPixel(): void {
    if (!this.isBrowser) return;

    // Implementar activación de Facebook Pixel si es necesario
    // console.log('Facebook Pixel activado');
  }

  private disableFacebookPixel(): void {
    if (!this.isBrowser) return;

    // Implementar desactivación de Facebook Pixel
    console.log('Facebook Pixel desactivado');
  }

  private enableFunctionalCookies(): void {
    if (!this.isBrowser) return;

    // Permitir guardar preferencias como idioma, tema, etc.
    console.log('Cookies funcionales activadas');
  }

  private disableFunctionalCookies(): void {
    if (!this.isBrowser) return;

    // Remover cookies funcionales
    console.log('Cookies funcionales desactivadas');
  }

  private removeAllCookies(): void {
    if (!this.isBrowser) return;

    // Eliminar todas las cookies opcionales (excepto las necesarias)
    const cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

      // No eliminar cookies necesarias (token, session, etc.)
      if (!this.isNecessaryCookie(name)) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    }
  }

  private isNecessaryCookie(name: string): boolean {
    const necessaryCookies = [
      'token',
      'auth_token',
      'session_id',
      'cart',
      'XSRF-TOKEN',
      this.STORAGE_KEY
    ];

    return necessaryCookies.some(nc => name.toLowerCase().includes(nc.toLowerCase()));
  }
}
