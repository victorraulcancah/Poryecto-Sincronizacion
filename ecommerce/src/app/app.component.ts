// src\app\app.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import * as AOS from 'aos';
import { Router, ActivatedRoute, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './services/auth.service';
import { CartNotificationService, CartNotificationData } from './services/cart-notification.service';
import { CartNotificationComponent } from './components/cart-notification/cart-notification.component';
import { CookieBannerComponent } from './components/cookie-banner/cookie-banner.component';
import { CookieConsentService } from './services/cookie-consent.service';
import { SplashLoaderComponent } from './components/splash-loader/splash-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CartNotificationComponent, CookieBannerComponent, SplashLoaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'marketpro';
  private isBrowser: boolean;
  cartNotificationData: CartNotificationData = {
    isVisible: false,
    productName: '',
    productPrice: 0,
    productImage: '',
    productMoneda: 's',
    quantity: 1,
    suggestedProducts: []
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cartNotificationService: CartNotificationService,
    private cookieConsentService: CookieConsentService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit() {
    // Inicializar el sistema de consentimiento de cookies
    this.cookieConsentService.initialize().subscribe({
      next: () => console.log('✅ Sistema de cookies inicializado'),
      error: (err) => console.error('❌ Error al inicializar cookies:', err)
    });

    // Suscribirse a las notificaciones del carrito
    this.cartNotificationService.notification$.subscribe(data => {
      this.cartNotificationData = data;
    });

    if (this.isBrowser) {
      if (isPlatformBrowser(this.platformId)) {
        AOS.init({
          duration: 1000,
          once: false, // ✅ CAMBIADO: permitir que AOS se re-ejecute en cambios dinámicos
          easing: 'ease-in-out',
          mirror: false, // No repetir animaciones al hacer scroll hacia arriba
          anchorPlacement: 'top-bottom'
        });

        // Refresco puntual de AOS al terminar cada navegación (antes era un
        // setInterval permanente cada 3 s). El contenido que llega después por
        // HTTP lo detecta el MutationObserver que AOS registra en init().
        this.router.events
          .pipe(filter((event) => event instanceof NavigationEnd))
          .subscribe(() => {
            setTimeout(() => AOS.refreshHard(), 300);
          });

        // Una vez que terminan de cargar las imágenes la página cambia de alto:
        // se recalculan las posiciones de las animaciones.
        if (document.readyState !== 'complete') {
          window.addEventListener('load', () => AOS.refresh(), { once: true });
        }
      }

      // Avisa al splash inicial de index.html que la app ya cargó (terminó la
      // primera navegación) para que se oculte de inmediato en vez de esperar
      // un tiempo fijo.
      let appListaAvisada = false;
      const avisarAppLista = () => {
        if (appListaAvisada) return;
        appListaAvisada = true;
        window.dispatchEvent(new Event('app-ready'));
      };
      this.router.events.subscribe((event) => {
        if (appListaAvisada) return;
        if (event instanceof NavigationEnd) {
          avisarAppLista();
        } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
          // Puede seguir una redirección (p. ej. el guard del dashboard envía a
          // /account): se espera un momento a que termine la navegación nueva.
          setTimeout(avisarAppLista, 1500);
        }
      });

      // Verificar si hay parámetros de autenticación de Google en la URL
      this.route.queryParams.subscribe(params => {
        const token = params['token'];
        const userData = params['user'];
        const tipoUsuario = params['tipo_usuario'];
        
        console.log('📋 Parámetros individuales:', {
          token: token ? 'EXISTE' : 'NO EXISTE',
          userData: userData ? 'EXISTE' : 'NO EXISTE',
          tipoUsuario: tipoUsuario,
          tokenLength: token?.length,
          userDataLength: userData?.length
        });

        if (token && userData && tipoUsuario === 'cliente') {
          try {
            console.log('✅ Iniciando processGoogleAuth...');
            console.log('👤 UserData sin decodificar:', userData);
            
            // Intentar decodificar userData antes de pasarlo
            const decodedUserData = decodeURIComponent(userData);
            console.log('👤 UserData decodificado:', decodedUserData);
            
            this.authService.processGoogleAuth(token, userData);
            
            console.log('🚀 processGoogleAuth completado, redirigiendo...');
            this.router.navigate(['/'], { replaceUrl: true });
            
          } catch (error) {
            console.error('❌ ERROR en app.component:', error);
            // resto del código...
          }
        } else {
          console.log('⚠️ Condición no cumplida:', {
            hasToken: !!token,
            hasUserData: !!userData,
            tipoUsuario: tipoUsuario
          });
        }
      });
    }
  }

  onCartNotificationClose() {
    this.cartNotificationService.hideNotification();
  }

  onViewCart() {
    this.cartNotificationService.hideNotification();
    this.router.navigate(['/cart']);
  }

  onSuggestedProductSelect(product: any) {
    this.router.navigate(['/product-details', product.id]);
  }
}