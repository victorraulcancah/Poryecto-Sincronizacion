import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BannersService, Banner, BannerCreate } from '../../../../services/banner.service';
import { PermissionsService } from '../../../../services/permissions.service';
import Swal from 'sweetalert2';

interface PosicionBanner {
  key: 'debajo_ofertas_especiales' | 'debajo_categorias' | 'debajo_ventas_flash';
  titulo: string;
  descripcion: string;
  icono: string;
  banner: Banner | null;
}

@Component({
  selector: 'app-banners-horizontales',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './banners-horizontales.component.html',
  styleUrl: './banners-horizontales.component.scss'
})
export class BannersHorizontalesComponent implements OnInit {
  isLoading = false;
  canEdit$ = false;
  canCreate$ = false;
  canDelete$ = false;

  // ✅ Banner sidebar shop (vertical)
  bannerSidebarShop: Banner | null = null;

  posiciones: PosicionBanner[] = [
    {
      key: 'debajo_categorias',
      titulo: 'Banner Debajo de Categorías',
      descripcion: 'Se muestra después de la sección "Inicio de funciones" (categorías)',
      icono: 'ph-squares-four',
      banner: null
    },
    {
      key: 'debajo_ofertas_especiales',
      titulo: 'Banner Debajo de Ofertas Especiales',
      descripcion: 'Se muestra después de la sección "Ofertas Especiales"',
      icono: 'ph-tag',
      banner: null
    },
    {
      key: 'debajo_ventas_flash',
      titulo: 'Banner Debajo de Ventas Flash',
      descripcion: 'Se muestra después de la sección "Ventas Flash"',
      icono: 'ph-lightning',
      banner: null
    }
  ];

  constructor(
    private bannersService: BannersService,
    private permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    this.verificarPermisos();
    this.cargarBannersHorizontales();
    this.cargarBannerSidebarShop(); // ✅ NUEVO
  }

  verificarPermisos(): void {
    this.canEdit$ = this.permissionsService.hasPermission('banners.edit');
    this.canCreate$ = this.permissionsService.hasPermission('banners.create');
    this.canDelete$ = this.permissionsService.hasPermission('banners.delete');
  }

  cargarBannersHorizontales(): void {
    this.isLoading = true;
    this.bannersService.obtenerBanners().subscribe({
      next: (banners) => {
        // Filtrar solo banners horizontales y asignarlos a sus posiciones
        const bannersHorizontales = banners.filter(b => b.tipo_banner === 'horizontal');

        this.posiciones.forEach(posicion => {
          const bannerEncontrado = bannersHorizontales.find(
            b => b.posicion_horizontal === posicion.key
          );
          posicion.banner = bannerEncontrado || null;
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar banners horizontales:', error);
        this.isLoading = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los banners horizontales',
          icon: 'error'
        });
      }
    });
  }

  cambiarBanner(posicion: PosicionBanner): void {
    // Abrir selector de archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validar tamaño (máx 2MB)
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          title: 'Error',
          text: 'La imagen no debe superar 2MB',
          icon: 'error'
        });
        return;
      }

      // Pedir URL de enlace
      const { value: enlaceUrl } = await Swal.fire({
        title: 'URL de Enlace',
        input: 'text',
        inputLabel: '¿A dónde debe redirigir el banner al hacer clic?',
        inputPlaceholder: '/shop o https://...',
        inputValue: posicion.banner?.enlace_url || '/shop',
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) {
            return 'Debes ingresar una URL';
          }
          return null;
        }
      });

      if (!enlaceUrl) return;

      // Crear o actualizar banner
      const bannerData: BannerCreate = {
        titulo: posicion.titulo,
        texto_boton: 'Ver más',
        enlace_url: enlaceUrl,
        activo: true,
        orden: this.getOrdenPorPosicion(posicion.key),
        tipo_banner: 'horizontal',
        posicion_horizontal: posicion.key,
        imagen: file
      };

      if (posicion.banner) {
        // Actualizar banner existente
        this.actualizarBanner(posicion.banner.id, bannerData, posicion);
      } else {
        // Crear nuevo banner
        this.crearBanner(bannerData, posicion);
      }
    };

    input.click();
  }

  private getOrdenPorPosicion(posicion: string): number {
    const ordenes = {
      'debajo_categorias': 1,
      'debajo_ofertas_especiales': 2,
      'debajo_ventas_flash': 3
    };
    return ordenes[posicion as keyof typeof ordenes] || 0;
  }

  private crearBanner(bannerData: BannerCreate, posicion: PosicionBanner): void {
    Swal.fire({
      title: 'Creando banner...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.bannersService.crearBanner(bannerData).subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Banner horizontal creado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.cargarBannersHorizontales();
      },
      error: (error) => {
        console.error('Error al crear banner:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo crear el banner horizontal',
          icon: 'error'
        });
      }
    });
  }

  private actualizarBanner(id: number, bannerData: BannerCreate, posicion: PosicionBanner): void {
    Swal.fire({
      title: 'Actualizando banner...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.bannersService.actualizarBanner(id, bannerData).subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Banner horizontal actualizado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.cargarBannersHorizontales();
      },
      error: (error) => {
        console.error('Error al actualizar banner:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el banner horizontal',
          icon: 'error'
        });
      }
    });
  }

  toggleEstado(posicion: PosicionBanner): void {
    if (!posicion.banner) return;

    const nuevoEstado = !posicion.banner.activo;

    Swal.fire({
      title: `¿${nuevoEstado ? 'Activar' : 'Desactivar'} banner?`,
      text: `El banner ${nuevoEstado ? 'se mostrará' : 'dejará de mostrarse'} en el sitio público`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: nuevoEstado ? '#198754' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: nuevoEstado ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && posicion.banner) {
        this.bannersService.toggleEstado(posicion.banner.id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Éxito!',
              text: `Banner ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarBannersHorizontales();
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo cambiar el estado del banner',
              icon: 'error'
            });
          }
        });
      }
    });
  }

  eliminarBanner(posicion: PosicionBanner): void {
    if (!posicion.banner) return;

    Swal.fire({
      title: '¿Eliminar banner?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && posicion.banner) {
        this.bannersService.eliminarBanner(posicion.banner.id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'Banner eliminado correctamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarBannersHorizontales();
          },
          error: (error) => {
            console.error('Error al eliminar banner:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el banner',
              icon: 'error'
            });
          }
        });
      }
    });
  }

  // ✅ NUEVOS MÉTODOS PARA BANNER SIDEBAR SHOP

  cargarBannerSidebarShop(): void {
    this.bannersService.obtenerBannerSidebarShop().subscribe({
      next: (banner) => {
        this.bannerSidebarShop = banner;
      },
      error: (error) => {
        console.error('Error al cargar banner sidebar shop:', error);
      }
    });
  }

  cambiarBannerSidebar(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          title: 'Error',
          text: 'La imagen no debe superar 2MB',
          icon: 'error'
        });
        return;
      }

      const { value: enlaceUrl } = await Swal.fire({
        title: 'URL de Enlace',
        input: 'text',
        inputLabel: '¿A dónde debe redirigir el banner al hacer clic?',
        inputPlaceholder: '/shop o https://...',
        inputValue: this.bannerSidebarShop?.enlace_url || '/shop',
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) {
            return 'Debes ingresar una URL';
          }
          return null;
        }
      });

      if (!enlaceUrl) return;

      const bannerData: BannerCreate = {
        titulo: 'Banner Sidebar Shop',
        texto_boton: 'Ver más',
        enlace_url: enlaceUrl,
        activo: true,
        orden: 1,
        tipo_banner: 'sidebar',
        posicion_horizontal: 'sidebar_shop',
        imagen: file
      };

      if (this.bannerSidebarShop) {
        this.actualizarBannerSidebar(this.bannerSidebarShop.id, bannerData);
      } else {
        this.crearBannerSidebar(bannerData);
      }
    };

    input.click();
  }

  private crearBannerSidebar(bannerData: BannerCreate): void {
    Swal.fire({
      title: 'Subiendo banner...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.bannersService.crearBanner(bannerData).subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Banner sidebar creado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.cargarBannerSidebarShop();
      },
      error: (error) => {
        console.error('Error al crear banner sidebar:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo crear el banner sidebar',
          icon: 'error'
        });
      }
    });
  }

  private actualizarBannerSidebar(id: number, bannerData: BannerCreate): void {
    Swal.fire({
      title: 'Actualizando banner...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.bannersService.actualizarBanner(id, bannerData).subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Banner sidebar actualizado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.cargarBannerSidebarShop();
      },
      error: (error) => {
        console.error('Error al actualizar banner sidebar:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el banner sidebar',
          icon: 'error'
        });
      }
    });
  }

  toggleEstadoSidebar(): void {
    if (!this.bannerSidebarShop) return;

    this.bannersService.toggleEstado(this.bannerSidebarShop.id).subscribe({
      next: (response) => {
        this.cargarBannerSidebarShop();
        Swal.fire({
          title: '¡Actualizado!',
          text: `Banner ${response.data.activo ? 'activado' : 'desactivado'} correctamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al cambiar estado del banner sidebar:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cambiar el estado del banner',
          icon: 'error'
        });
      }
    });
  }

  eliminarBannerSidebar(): void {
    if (!this.bannerSidebarShop) return;

    Swal.fire({
      title: '¿Eliminar banner sidebar?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && this.bannerSidebarShop) {
        this.bannersService.eliminarBanner(this.bannerSidebarShop.id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'Banner sidebar eliminado correctamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarBannerSidebarShop();
          },
          error: (error) => {
            console.error('Error al eliminar banner sidebar:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el banner sidebar',
              icon: 'error'
            });
          }
        });
      }
    });
  }
}
