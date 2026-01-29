// src\app\app.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import * as AOS from 'aos';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CartNotificationService, CartNotificationData } from './services/cart-notification.service';
import { CartNotificationComponent } from './components/cart-notification/cart-notification.component';
import { CookieBannerComponent } from './components/cookie-banner/cookie-banner.component';
import { CookieConsentService } from './services/cookie-consent.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CartNotificationComponent, CookieBannerComponent],
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

        // ✅ NUEVO: Refrescar AOS periódicamente para elementos cargados dinámicamente
        setInterval(() => {
          AOS.refresh();
        }, 3000);
      }

      // Verificar si hay parámetros de autenticación de Google en la URL
      this.route.queryParams.subscribe(params => {
        console.log('🔍 TODOS los parámetros:', params);
        
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
            console.log('🎯 Token a procesar:', token);
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