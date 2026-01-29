// src/app/components/cookie-banner/cookie-banner.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { CookieConsentService, CookieConfig } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class CookieBannerComponent implements OnInit, OnDestroy {
  isVisible = false;
  showSettings = false;
  config: CookieConfig | null = null;

  customPreferences = {
    cookies_analiticas: false,
    cookies_marketing: false,
    cookies_funcionales: false
  };

  private subscriptions: Subscription[] = [];

  constructor(private cookieService: CookieConsentService) {}

  ngOnInit(): void {
    // Suscribirse al estado del banner
    const bannerSub = this.cookieService.bannerVisible$.subscribe(visible => {
      this.isVisible = visible;
    });
    this.subscriptions.push(bannerSub);

    // Suscribirse a la configuración
    const configSub = this.cookieService.config$.subscribe(config => {
      this.config = config;
    });
    this.subscriptions.push(configSub);

    // Cargar preferencias actuales si existen
    const currentPreferences = this.cookieService.getCurrentPreferences();
    if (currentPreferences) {
      this.customPreferences = {
        cookies_analiticas: currentPreferences.cookies_analiticas,
        cookies_marketing: currentPreferences.cookies_marketing,
        cookies_funcionales: currentPreferences.cookies_funcionales
      };
    }

    // Escuchar evento personalizado para abrir configuración de cookies
    if (typeof window !== 'undefined') {
      window.addEventListener('openCookieSettings', () => {
        this.openSettings();
      });
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Aceptar todas las cookies
   */
  acceptAll(): void {
    this.cookieService.acceptAll().subscribe({
      next: () => {
        console.log('✅ Todas las cookies aceptadas');
        this.closeSettings();
      },
      error: (err) => {
        console.error('❌ Error al aceptar cookies:', err);
      }
    });
  }

  /**
   * Rechazar todas las cookies opcionales
   */
  rejectAll(): void {
    this.cookieService.rejectAll().subscribe({
      next: () => {
        console.log('✅ Cookies opcionales rechazadas');
        this.closeSettings();
      },
      error: (err) => {
        console.error('❌ Error al rechazar cookies:', err);
      }
    });
  }

  /**
   * Guardar preferencias personalizadas
   */
  saveCustomPreferences(): void {
    this.cookieService.saveCustomPreferences(this.customPreferences).subscribe({
      next: () => {
        console.log('✅ Preferencias personalizadas guardadas');
        this.closeSettings();
      },
      error: (err) => {
        console.error('❌ Error al guardar preferencias:', err);
      }
    });
  }

  /**
   * Abrir modal de configuración
   */
  openSettings(): void {
    this.showSettings = true;

    // Cargar preferencias actuales
    const currentPreferences = this.cookieService.getCurrentPreferences();
    if (currentPreferences) {
      this.customPreferences = {
        cookies_analiticas: currentPreferences.cookies_analiticas,
        cookies_marketing: currentPreferences.cookies_marketing,
        cookies_funcionales: currentPreferences.cookies_funcionales
      };
    }

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  /**
   * Cerrar modal de configuración
   */
  closeSettings(): void {
    this.showSettings = false;

    // Restaurar scroll del body
    document.body.style.overflow = '';
  }

  /**
   * Cerrar banner temporalmente (sin guardar preferencias)
   */
  closeBanner(): void {
    this.isVisible = false;
  }
}
