// src/app/pages/sobre-nosotros/sobre-nosotros.component.ts
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { SobreNosotrosService } from '../../services/sobre-nosotros.service';
import {
  EmpresaValor,
  EmpresaHito,
  EmpresaPremio,
  EmpresaBannerNosotros,
  SobreNosotrosPublico,
} from '../../types/sobre-nosotros.types';

interface RedSocial {
  icon: string;
  url: string;
}

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule, ShippingComponent, SlickCarouselModule],
  templateUrl: './sobre-nosotros.component.html',
  styleUrl: './sobre-nosotros.component.scss',
})
export class SobreNosotrosComponent implements OnInit {
  isBrowser: boolean;

  nombreEmpresa = '';
  descripcion = '';
  sobreNosotros = '';
  imagenIntroduccionUrl = '';
  horarioAtencion = '';
  direccion = '';
  telefono = '';
  celular = '';
  email = '';
  banners: EmpresaBannerNosotros[] = [];
  valores: EmpresaValor[] = [];
  hitos: EmpresaHito[] = [];
  premios: EmpresaPremio[] = [];
  redesSociales: RedSocial[] = [];
  isLoading = true;

  bannerConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 6000,
    speed: 700,
    fade: true,
    cssEase: 'ease-in-out',
    pauseOnHover: false,
  };

  hitosConfig = {
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: true,
    dots: false,
    infinite: false,
    autoplay: false,
    speed: 500,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 992, settings: { slidesToShow: 2 } },
      { breakpoint: 576, settings: { slidesToShow: 1, arrows: false, dots: true } },
    ],
  };

  constructor(
    private sobreNosotrosService: SobreNosotrosService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.sobreNosotrosService.obtenerSobreNosotrosPublico().subscribe({
      next: (data) => {
        this.aplicarDatos(data);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private aplicarDatos(data: SobreNosotrosPublico): void {
    this.nombreEmpresa = data.nombre_empresa || '';
    this.descripcion = data.descripcion || '';
    this.sobreNosotros = data.sobre_nosotros || '';
    this.imagenIntroduccionUrl = data.imagen_introduccion_url || '';
    this.horarioAtencion = data.horario_atencion || '';
    this.direccion = data.direccion || '';
    this.telefono = data.telefono || '';
    this.celular = data.celular || '';
    this.email = data.email || '';
    this.bannerConfig.autoplaySpeed = (data.duracion_banner_segundos || 5) * 1000;
    this.banners = data.banners || [];
    this.valores = data.valores || [];
    this.hitos = data.hitos || [];
    this.premios = data.premios || [];

    this.redesSociales = [];
    if (data.facebook) this.redesSociales.push({ icon: 'ph-fill ph-facebook-logo', url: data.facebook });
    if (data.instagram) this.redesSociales.push({ icon: 'ph-fill ph-instagram-logo', url: data.instagram });
    if (data.twitter) this.redesSociales.push({ icon: 'ph-fill ph-twitter-logo', url: data.twitter });
    if (data.youtube) this.redesSociales.push({ icon: 'ph-fill ph-youtube-logo', url: data.youtube });
    if (data.tiktok) this.redesSociales.push({ icon: 'ph-fill ph-tiktok-logo', url: data.tiktok });
    if (data.whatsapp) this.redesSociales.push({ icon: 'ph-fill ph-whatsapp-logo', url: `https://wa.me/${data.whatsapp}` });
  }

  get tieneInfoContacto(): boolean {
    return !!(this.horarioAtencion || this.direccion || this.telefono || this.celular || this.email || this.redesSociales.length);
  }
}
