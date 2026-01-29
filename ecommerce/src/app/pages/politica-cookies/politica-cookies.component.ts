import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-politica-cookies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './politica-cookies.component.html',
  styleUrl: './politica-cookies.component.scss'
})
export class PoliticaCookiesComponent implements OnInit {
  fechaActualizacion: string = 'Enero 2025';
  nombreEmpresa: string = 'MarketPro';
  emailContacto: string = '';

  constructor(
    private router: Router,
    private cookieConsentService: CookieConsentService
  ) {
    // Generar email de contacto basado en el nombre de la empresa
    this.emailContacto = `privacidad@${this.nombreEmpresa.toLowerCase().replace(/\s/g, '')}.com`;
  }

  ngOnInit(): void {
    // Scroll al inicio de la página
    window.scrollTo(0, 0);
  }

  /**
   * Abrir modal de configuración de cookies
   */
  abrirConfiguracionCookies(): void {
    // Mostrar el banner de cookies con la configuración abierta
    this.cookieConsentService.showBanner();

    // Esperar un momento y luego abrir el modal
    setTimeout(() => {
      // Emitir evento personalizado para que el banner abra el modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openCookieSettings'));
      }
    }, 100);
  }

  /**
   * Volver a la página de inicio
   */
  volverInicio(): void {
    this.router.navigate(['/']);
  }
}
