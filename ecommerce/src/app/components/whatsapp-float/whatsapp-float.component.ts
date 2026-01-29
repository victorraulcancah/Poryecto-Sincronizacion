import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HorariosService, AsesorDisponible } from '../../services/horarios.service';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment'; // Ajusta la ruta según tu estructura

@Component({
  selector: 'app-whatsapp-float',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-float.component.html',
  styleUrls: ['./whatsapp-float.component.scss']
})
export class WhatsappFloatComponent implements OnInit, OnDestroy {
  isExpanded = false;
  isLoadingAsesores = false;
  asesorDisponibles: AsesorDisponible[] = [];
  private refreshSubscription?: Subscription;
  private isBrowser: boolean;

  constructor(
    private horariosService: HorariosService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // console.log('WhatsApp Float Component inicializado');
  }

  ngOnInit(): void {
    // console.log('WhatsApp Float ngOnInit ejecutado');
    if (this.isBrowser) {
      this.cargarAsesorDisponibles();
      
      // Actualizar lista cada 2 minutos
      this.refreshSubscription = interval(120000).subscribe(() => {
        this.cargarAsesorDisponibles();
      });
    }
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  toggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
    console.log('Toggle expansion:', this.isExpanded);
    
    if (this.isExpanded) {
      this.cargarAsesorDisponibles();
    }
  }

  cargarAsesorDisponibles(): void {
    // console.log('Cargando asesores disponibles...');
    this.isLoadingAsesores = true;
    
    this.horariosService.obtenerAsesorDisponibles().subscribe({
      next: (response) => {
        // console.log('Asesores recibidos:', response);
        this.asesorDisponibles = response.asesores_disponibles;
        this.isLoadingAsesores = false;
      },
      error: (error) => {
        // console.error('Error al cargar asesores disponibles:', error);
        this.isLoadingAsesores = false;
        this.asesorDisponibles = [];
      }
    });
  }

  contactarAsesor(asesor: AsesorDisponible): void {
    if (!this.isBrowser) return;

    const telefono = this.limpiarTelefono(asesor.telefono);
    if (!telefono) {
      // console.warn('Asesor sin teléfono configurado:', asesor.name);
      return;
    }

    const mensaje = encodeURIComponent(
      `¡Hola ${asesor.name}! Me gustaría recibir asesoría sobre sus productos. ¿Podrías ayudarme?`
    );
    
    const whatsappUrl = `https://wa.me/${telefono}?text=${mensaje}`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = `whatsapp://send?phone=${telefono}&text=${mensaje}`;
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 1000);
    } else {
      window.open(whatsappUrl, '_blank');
    }

    this.isExpanded = false;
  }

  private limpiarTelefono(telefono?: string): string {
    if (!telefono) return '';
    
    let numero = telefono.replace(/\D/g, '');
    
    if (numero.startsWith('9') && numero.length === 9) {
      numero = '51' + numero;
    }
    
    if (numero.length === 9) {
      numero = '51' + numero;
    }
    
    return numero;
  }

  // Agregar al final de tu clase WhatsappFloatComponent, antes del último }

  obtenerUrlAvatarAsesor(usuario: any): string {
    // Para el objeto asesor
    if (usuario?.profile?.avatar_url) {
      return `${environment.baseUrl}${usuario.profile.avatar_url}`;
    }
    // Si el asesor tiene la imagen directamente en avatar_url
    if (usuario?.avatar_url) {
      return `${environment.baseUrl}${usuario.avatar_url}`;
    }
    // Si el asesor tiene la imagen en avatar
    if (usuario?.avatar) {
      return `${environment.baseUrl}${usuario.avatar}`;
    }
    return ''; // Retornar vacío cuando no hay avatar
  }

  // Nuevo método para verificar si debe mostrar la inicial
  mostrarInicialAsesor(usuario: any): boolean {
    return !this.obtenerUrlAvatarAsesor(usuario);
  }

  // Nuevo método para obtener la inicial del nombre
  obtenerInicialAsesor(usuario: any): string {
    if (usuario?.name) {
      return usuario.name.charAt(0).toUpperCase();
    }
    return 'A'; // Inicial por defecto
  }
}
