// src\app\layouts\main-layouts\footer\footer.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaInfoService } from '../../../services/empresa-info.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit {
  emailSuscripcion = '';

  // ✅ Datos dinámicos de la empresa (cargados desde la API)
  empresaInfo: any = {
    nombre_empresa: 'Cargando...',
    email: '',
    telefono: '',
    celular: '',
    direccion: '',
    horario_atencion: '',
    logo_url: '/assets/images/logo/logo3.png',
    facebook: null,
    instagram: null,
    twitter: null,
    youtube: null,
    whatsapp: null,
    website: null
  };

  // ✅ Redes sociales dinámicas (se actualizan con los datos de la API)
  socialLinks: any[] = [];

  footerSections = [
    {
      title: 'Contáctanos',
      links: [
        { label: 'Contacto', route: ['/contact'] }
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
        { label: 'Política de Privacidad', route: ['/privacy-policy'] },
        { label: 'Términos y condiciones', route: ['terms'] },
        { label: 'Política de devoluciones y rembolsos', route: ['returns'] },
        { label: 'Preguntas frecuentes', route: ['faq'] }
      ]
    }
  ];

  paymentMethods = [
    { name: 'Visa', image: '/assets/images/payment/visa.png' },
    { name: 'Mastercard', image: '/assets/images/payment/mastercard.png' },
    { name: 'American Express', image: '/assets/images/payment/amex.png' },
    { name: 'Yape', image: '/assets/images/payment/yape.png' },
    { name: 'Plin', image: '/assets/images/payment/plin.png' }
  ];

  constructor(private empresaInfoService: EmpresaInfoService) {}

  ngOnInit(): void {
    this.cargarDatosEmpresa();
  }

  // ✅ Cargar datos de la empresa desde la API
  cargarDatosEmpresa(): void {
    this.empresaInfoService.obtenerEmpresaInfoPublica().subscribe({
      next: (data) => {
        this.empresaInfo = data;

        // ✅ Construir enlaces de redes sociales dinámicamente
        this.socialLinks = [];

        if (data.facebook) {
          this.socialLinks.push({
            icon: 'ph-fill ph-facebook-logo',
            url: data.facebook
          });
        }

        if (data.instagram) {
          this.socialLinks.push({
            icon: 'ph-fill ph-instagram-logo',
            url: data.instagram
          });
        }

        if (data.twitter) {
          this.socialLinks.push({
            icon: 'ph-fill ph-twitter-logo',
            url: data.twitter
          });
        }

        if (data.youtube) {
          this.socialLinks.push({
            icon: 'ph-fill ph-youtube-logo',
            url: data.youtube
          });
        }

        if (data.whatsapp) {
          this.socialLinks.push({
            icon: 'ph-fill ph-whatsapp-logo',
            url: `https://wa.me/${data.whatsapp}`
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar datos de la empresa:', error);
      }
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