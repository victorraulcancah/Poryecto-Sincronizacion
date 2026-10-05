// src\app\layouts\main-layouts\footer\footer.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { EmpresaInfoService } from '../../../services/empresa-info.service';
import { EmpresaMetodoPago } from '../../../types/sobre-nosotros.types';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  emailSuscripcion = '';

  // ✅ Datos dinámicos de la empresa (cargados desde la API)
  empresaInfo: any = {
    nombre_empresa: 'Cargando...',
    email: '',
    telefono: '',
    celular: '',
    direccion: '',
    horario_atencion: '',
    logo_url: '/assets/images/logo/logo.svg',
    facebook: null,
    instagram: null,
    twitter: null,
    youtube: null,
    whatsapp: null,
    website: null
  };

  // ✅ Redes sociales dinámicas (se actualizan con los datos de la API)
  socialLinks: any[] = [];

  // `href` abre un archivo (PDF) en otra pestaña; `route` navega dentro de la app.
  footerSections: {
    title: string;
    links: { label: string; route?: string[]; href?: string }[];
  }[] = [
    {
      title: 'Contáctanos',
      links: [
        { label: 'Contacto', route: ['/contact'] },
        { label: 'Sobre Nosotros', route: ['/sobre-nosotros'] }
      ]
    },
    {
      title: 'Populares',
      links: [
        { label: 'Ofertas', route: ['/'] }, // TODO: Crear vista de ofertas
        { label: 'Promociones', route: ['/'] }, // TODO: Crear vista de promociones
        { label: 'Venta Flash', route: ['/'] } // TODO: Crear vista de venta flash
      ]
    },
    {
      title: 'Área legal',
      links: [
        { label: 'Información legal', href: '/assets/legal/informacion-legal.pdf' },
        { label: 'Términos y condiciones', href: '/assets/legal/terminos-y-condiciones-de-compra.pdf' },
        // Los cambios y devoluciones son las secciones 11 y 12 de los términos
        // (página 3 del PDF): no hay un documento aparte.
        { label: 'Política de cambios y devoluciones', href: '/assets/legal/terminos-y-condiciones-de-compra.pdf#page=3' },
        { label: 'Política de privacidad', href: '/assets/legal/politica-de-privacidad-y-proteccion-de-datos-personales.pdf' }
      ]
    }
  ];

  // Se cargan desde el CRUD de "Métodos de Pago" en el panel de administración
  paymentMethods: EmpresaMetodoPago[] = [];

  constructor(private empresaInfoService: EmpresaInfoService) {}

  ngOnInit(): void {
    this.cargarDatosEmpresa();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatosEmpresa(): void {
    this.empresaInfoService.empresaInfoPublica$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data === null) return;
        this.empresaInfo = data;
        this.socialLinks = [];
        if (data.facebook) this.socialLinks.push({ icon: 'ph-fill ph-facebook-logo', url: data.facebook });
        if (data.instagram) this.socialLinks.push({ icon: 'ph-fill ph-instagram-logo', url: data.instagram });
        if (data.twitter) this.socialLinks.push({ icon: 'ph-fill ph-twitter-logo', url: data.twitter });
        if (data.youtube) this.socialLinks.push({ icon: 'ph-fill ph-youtube-logo', url: data.youtube });
        if (data.tiktok) this.socialLinks.push({ icon: 'ph-fill ph-tiktok-logo', url: data.tiktok });
        if (data.whatsapp) this.socialLinks.push({ icon: 'ph-fill ph-whatsapp-logo', url: `https://wa.me/${data.whatsapp}` });

        this.paymentMethods = data.metodos_pago || [];
      });
  }

  suscribirse(): void {
    if (this.emailSuscripcion.trim()) {
      console.log('Suscribiendo email:', this.emailSuscripcion);
      // Aquí implementarías la lógica de suscripción
      this.emailSuscripcion = '';
      // Mostrar mensaje de éxito
    }
  }
}