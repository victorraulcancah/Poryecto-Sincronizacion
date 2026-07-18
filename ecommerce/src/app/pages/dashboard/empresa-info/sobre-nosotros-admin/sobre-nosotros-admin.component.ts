// src/app/pages/dashboard/empresa-info/sobre-nosotros-admin/sobre-nosotros-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmpresaInfoService } from '../../../../services/empresa-info.service';
import { SobreNosotrosService } from '../../../../services/sobre-nosotros.service';
import { PermissionsService } from '../../../../services/permissions.service';
import {
  EmpresaValor,
  EmpresaHito,
  EmpresaPremio,
  EmpresaBannerNosotros,
} from '../../../../types/sobre-nosotros.types';
import { mostrarErrorGuardado } from '../../../../utils/mostrar-error.util';
import Swal from 'sweetalert2';

type SubTab = 'banner' | 'intro' | 'valores' | 'historia' | 'premios';

@Component({
  selector: 'app-sobre-nosotros-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sobre-nosotros-admin.component.html',
  styleUrl: './sobre-nosotros-admin.component.scss',
})
export class SobreNosotrosAdminComponent implements OnInit {
  subTab: SubTab = 'banner';

  // ===== Banner principal (hero carrusel) =====
  banners: EmpresaBannerNosotros[] = [];
  isLoadingBanners = true;
  mostrarFormBanner = false;
  bannerEditando: EmpresaBannerNosotros | null = null;
  bannerForm: FormGroup;
  bannerImagenSeleccionada: File | null = null;
  bannerImagenPreview: string | null = null;
  isSavingBanner = false;

  readonly DURACION_MIN = 2;
  readonly DURACION_MAX = 30;
  duracionBannerForm: FormGroup;
  isSavingDuracion = false;

  // ===== Introducción =====
  empresaId: number | null = null;
  introForm: FormGroup;
  isLoadingIntro = true;
  isSavingIntro = false;
  introImagenSeleccionada: File | null = null;
  introImagenPreview: string | null = null;
  introImagenEliminada = false;

  // ===== Descripción =====
  descripcionForm: FormGroup;
  isSavingDescripcion = false;
  descripcionImagenSeleccionada: File | null = null;
  descripcionImagenPreview: string | null = null;
  descripcionImagenEliminada = false;

  // ===== Valores =====
  valores: EmpresaValor[] = [];
  isLoadingValores = true;
  mostrarFormValor = false;
  valorEditando: EmpresaValor | null = null;
  valorForm: FormGroup;
  valorImagenSeleccionada: File | null = null;
  valorImagenPreview: string | null = null;
  isSavingValor = false;

  // ===== Historia / Hitos =====
  hitos: EmpresaHito[] = [];
  isLoadingHitos = true;
  mostrarFormHito = false;
  hitoEditando: EmpresaHito | null = null;
  hitoForm: FormGroup;
  hitoImagenSeleccionada: File | null = null;
  hitoImagenPreview: string | null = null;
  isSavingHito = false;

  // ===== Premios =====
  premios: EmpresaPremio[] = [];
  isLoadingPremios = true;
  mostrarFormPremio = false;
  premioEditando: EmpresaPremio | null = null;
  premioForm: FormGroup;
  premioImagenSeleccionada: File | null = null;
  premioImagenPreview: string | null = null;
  isSavingPremio = false;

  constructor(
    private fb: FormBuilder,
    private empresaInfoService: EmpresaInfoService,
    private sobreNosotrosService: SobreNosotrosService,
    public permissionsService: PermissionsService
  ) {
    this.bannerForm = this.fb.group({
      titulo: [''],
      subtitulo: [''],
      orden: [0],
      activo: [true],
    });

    this.duracionBannerForm = this.fb.group({
      duracion_banner_segundos: [
        5,
        [Validators.required, Validators.min(this.DURACION_MIN), Validators.max(this.DURACION_MAX)],
      ],
    });

    this.introForm = this.fb.group({
      sobre_nosotros: [''],
    });

    this.descripcionForm = this.fb.group({
      descripcion: [''],
    });

    this.valorForm = this.fb.group({
      titulo: ['', [Validators.required]],
      descripcion: [''],
      orden: [0],
      activo: [true],
    });

    this.hitoForm = this.fb.group({
      anio: ['', [Validators.required, Validators.maxLength(10)]],
      descripcion: ['', [Validators.required]],
      orden: [0],
      activo: [true],
    });

    this.premioForm = this.fb.group({
      titulo: ['', [Validators.required]],
      anio: [''],
      orden: [0],
      activo: [true],
    });
  }

  ngOnInit(): void {
    this.cargarBanners();
    this.cargarIntro();
    this.cargarValores();
    this.cargarHitos();
    this.cargarPremios();
  }

  puedeEditar(): boolean {
    return this.permissionsService.canEditEmpresaInfo();
  }

  // ==================================================
  // BANNER PRINCIPAL (hero carrusel)
  // ==================================================
  cargarBanners(): void {
    this.isLoadingBanners = true;
    this.sobreNosotrosService.obtenerBanners().subscribe({
      next: (banners) => {
        this.banners = banners;
        this.isLoadingBanners = false;
      },
      error: () => {
        this.isLoadingBanners = false;
      },
    });
  }

  nuevoBanner(): void {
    this.bannerEditando = null;
    this.bannerForm.reset({ titulo: '', subtitulo: '', orden: this.banners.length, activo: true });
    this.bannerImagenSeleccionada = null;
    this.bannerImagenPreview = null;
    this.mostrarFormBanner = true;
  }

  editarBanner(banner: EmpresaBannerNosotros): void {
    this.bannerEditando = banner;
    this.bannerForm.patchValue({
      titulo: banner.titulo || '',
      subtitulo: banner.subtitulo || '',
      orden: banner.orden,
      activo: banner.activo,
    });
    this.bannerImagenSeleccionada = null;
    this.bannerImagenPreview = banner.imagen_url || null;
    this.mostrarFormBanner = true;
  }

  cancelarFormBanner(): void {
    this.mostrarFormBanner = false;
    this.bannerEditando = null;
  }

  onBannerImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.bannerImagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.bannerImagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  guardarBanner(): void {
    if (!this.bannerEditando && !this.bannerImagenSeleccionada) {
      Swal.fire({
        title: 'Falta la imagen',
        text: 'Debes subir una imagen para el banner.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.isSavingBanner = true;
    const formValue = {
      ...this.bannerForm.value,
      imagen: this.bannerImagenSeleccionada || undefined,
    };

    const request = this.bannerEditando
      ? this.sobreNosotrosService.actualizarBanner(this.bannerEditando.id, formValue)
      : this.sobreNosotrosService.crearBanner(formValue);

    request.subscribe({
      next: () => {
        this.isSavingBanner = false;
        this.mostrarFormBanner = false;
        this.cargarBanners();
        this.empresaInfoService.refreshPublicInfo();
      },
      error: (error) => {
        this.isSavingBanner = false;
        mostrarErrorGuardado(error, 'el banner');
      },
    });
  }

  eliminarBanner(banner: EmpresaBannerNosotros): void {
    Swal.fire({
      title: '¿Eliminar banner?',
      text: 'Esta imagen dejará de mostrarse en la parte superior de "Sobre Nosotros".',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.sobreNosotrosService.eliminarBanner(banner.id).subscribe({
          next: () => {
            this.cargarBanners();
            this.empresaInfoService.refreshPublicInfo();
          },
          error: () =>
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el banner.',
              icon: 'error',
              confirmButtonColor: '#dc3545',
            }),
        });
      }
    });
  }

  guardarDuracionBanner(): void {
    if (!this.duracionBannerForm.valid) {
      this.duracionBannerForm.markAllAsTouched();
      return;
    }

    if (!this.empresaId) {
      Swal.fire({
        title: 'Falta información',
        text: 'Primero completa los datos generales de la empresa en la pestaña "Datos de la Empresa".',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.isSavingDuracion = true;
    this.empresaInfoService
      .actualizarConfigBanner(this.empresaId, this.duracionBannerForm.get('duracion_banner_segundos')?.value)
      .subscribe({
        next: () => {
          this.isSavingDuracion = false;
          this.empresaInfoService.refreshPublicInfo();
          Swal.fire({
            title: '¡Guardado!',
            text: 'La duración del carrusel se actualizó exitosamente.',
            icon: 'success',
            confirmButtonColor: '#198754',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.isSavingDuracion = false;
          mostrarErrorGuardado(error, 'la duración del carrusel');
        },
      });
  }

  // ==================================================
  // INTRODUCCIÓN
  // ==================================================
  cargarIntro(): void {
    this.isLoadingIntro = true;
    this.empresaInfoService.obtenerEmpresaInfo().subscribe({
      next: (empresaInfo) => {
        this.empresaId = empresaInfo.id;
        this.introForm.patchValue({ sobre_nosotros: empresaInfo.sobre_nosotros || '' });
        this.introImagenPreview = empresaInfo.imagen_introduccion_url || null;
        this.introImagenSeleccionada = null;
        this.introImagenEliminada = false;
        this.descripcionForm.patchValue({ descripcion: empresaInfo.descripcion || '' });
        this.descripcionImagenPreview = empresaInfo.imagen_descripcion_url || null;
        this.descripcionImagenSeleccionada = null;
        this.descripcionImagenEliminada = false;
        this.duracionBannerForm.patchValue({
          duracion_banner_segundos: empresaInfo.duracion_banner_segundos || 5,
        });
        this.isLoadingIntro = false;
      },
      error: () => {
        // No existe información de empresa todavía (404) u otro error de carga
        this.empresaId = null;
        this.isLoadingIntro = false;
      },
    });
  }

  onIntroImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.introImagenSeleccionada = file;
      this.introImagenEliminada = false;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.introImagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  eliminarIntroImagen(): void {
    this.introImagenSeleccionada = null;
    this.introImagenPreview = null;
    this.introImagenEliminada = true;
  }

  guardarIntro(): void {
    if (!this.empresaId) {
      Swal.fire({
        title: 'Falta información',
        text: 'Primero completa los datos generales de la empresa en la pestaña "Datos de la Empresa".',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.isSavingIntro = true;
    this.empresaInfoService
      .actualizarSobreNosotros(this.empresaId, {
        sobreNosotros: this.introForm.get('sobre_nosotros')?.value || '',
        imagen: this.introImagenSeleccionada,
        eliminarImagen: this.introImagenEliminada,
      })
      .subscribe({
        next: () => {
          this.isSavingIntro = false;
          this.introImagenSeleccionada = null;
          this.introImagenEliminada = false;
          this.empresaInfoService.refreshPublicInfo();
          Swal.fire({
            title: '¡Guardado!',
            text: 'La introducción de "Sobre Nosotros" se actualizó exitosamente.',
            icon: 'success',
            confirmButtonColor: '#198754',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.isSavingIntro = false;
          mostrarErrorGuardado(error, 'la introducción');
        },
      });
  }

  // ==================================================
  // DESCRIPCIÓN
  // ==================================================
  onDescripcionImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.descripcionImagenSeleccionada = file;
      this.descripcionImagenEliminada = false;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.descripcionImagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  eliminarDescripcionImagen(): void {
    this.descripcionImagenSeleccionada = null;
    this.descripcionImagenPreview = null;
    this.descripcionImagenEliminada = true;
  }

  guardarDescripcion(): void {
    if (!this.empresaId) {
      Swal.fire({
        title: 'Falta información',
        text: 'Primero completa los datos generales de la empresa en la pestaña "Datos de la Empresa".',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    this.isSavingDescripcion = true;
    this.empresaInfoService
      .actualizarDescripcion(this.empresaId, {
        descripcion: this.descripcionForm.get('descripcion')?.value || '',
        imagen: this.descripcionImagenSeleccionada,
        eliminarImagen: this.descripcionImagenEliminada,
      })
      .subscribe({
        next: () => {
          this.isSavingDescripcion = false;
          this.descripcionImagenSeleccionada = null;
          this.descripcionImagenEliminada = false;
          this.empresaInfoService.refreshPublicInfo();
          Swal.fire({
            title: '¡Guardado!',
            text: 'La descripción de "Sobre Nosotros" se actualizó exitosamente.',
            icon: 'success',
            confirmButtonColor: '#198754',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.isSavingDescripcion = false;
          mostrarErrorGuardado(error, 'la descripción');
        },
      });
  }

  // ==================================================
  // VALORES
  // ==================================================
  cargarValores(): void {
    this.isLoadingValores = true;
    this.sobreNosotrosService.obtenerValores().subscribe({
      next: (valores) => {
        this.valores = valores;
        this.isLoadingValores = false;
      },
      error: () => {
        this.isLoadingValores = false;
      },
    });
  }

  nuevoValor(): void {
    this.valorEditando = null;
    this.valorForm.reset({ titulo: '', descripcion: '', orden: this.valores.length, activo: true });
    this.valorImagenSeleccionada = null;
    this.valorImagenPreview = null;
    this.mostrarFormValor = true;
  }

  editarValor(valor: EmpresaValor): void {
    this.valorEditando = valor;
    this.valorForm.patchValue({
      titulo: valor.titulo,
      descripcion: valor.descripcion || '',
      orden: valor.orden,
      activo: valor.activo,
    });
    this.valorImagenSeleccionada = null;
    this.valorImagenPreview = valor.imagen_url || null;
    this.mostrarFormValor = true;
  }

  cancelarFormValor(): void {
    this.mostrarFormValor = false;
    this.valorEditando = null;
  }

  onValorImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.valorImagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.valorImagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  guardarValor(): void {
    if (!this.valorForm.valid) {
      this.valorForm.markAllAsTouched();
      return;
    }

    this.isSavingValor = true;
    const formValue = {
      ...this.valorForm.value,
      imagen: this.valorImagenSeleccionada || undefined,
    };

    const request = this.valorEditando
      ? this.sobreNosotrosService.actualizarValor(this.valorEditando.id, formValue)
      : this.sobreNosotrosService.crearValor(formValue);

    request.subscribe({
      next: () => {
        this.isSavingValor = false;
        this.mostrarFormValor = false;
        this.cargarValores();
        this.empresaInfoService.refreshPublicInfo();
      },
      error: (error) => {
        this.isSavingValor = false;
        mostrarErrorGuardado(error, 'el valor');
      },
    });
  }

  eliminarValor(valor: EmpresaValor): void {
    Swal.fire({
      title: '¿Eliminar valor?',
      html: `Estás a punto de eliminar <strong>"${valor.titulo}"</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.sobreNosotrosService.eliminarValor(valor.id).subscribe({
          next: () => this.cargarValores(),
          error: () =>
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el valor.',
              icon: 'error',
              confirmButtonColor: '#dc3545',
            }),
        });
      }
    });
  }

  // ==================================================
  // HISTORIA / HITOS
  // ==================================================
  cargarHitos(): void {
    this.isLoadingHitos = true;
    this.sobreNosotrosService.obtenerHitos().subscribe({
      next: (hitos) => {
        this.hitos = hitos;
        this.isLoadingHitos = false;
      },
      error: () => {
        this.isLoadingHitos = false;
      },
    });
  }

  nuevoHito(): void {
    this.hitoEditando = null;
    this.hitoForm.reset({ anio: '', descripcion: '', orden: this.hitos.length, activo: true });
    this.hitoImagenSeleccionada = null;
    this.hitoImagenPreview = null;
    this.mostrarFormHito = true;
  }

  editarHito(hito: EmpresaHito): void {
    this.hitoEditando = hito;
    this.hitoForm.patchValue({
      anio: hito.anio,
      descripcion: hito.descripcion,
      orden: hito.orden,
      activo: hito.activo,
    });
    this.hitoImagenSeleccionada = null;
    this.hitoImagenPreview = hito.imagen_url || null;
    this.mostrarFormHito = true;
  }

  cancelarFormHito(): void {
    this.mostrarFormHito = false;
    this.hitoEditando = null;
  }

  onHitoImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.hitoImagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.hitoImagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  guardarHito(): void {
    if (!this.hitoForm.valid) {
      this.hitoForm.markAllAsTouched();
      return;
    }

    this.isSavingHito = true;
    const formValue = {
      ...this.hitoForm.value,
      imagen: this.hitoImagenSeleccionada || undefined,
    };

    const request = this.hitoEditando
      ? this.sobreNosotrosService.actualizarHito(this.hitoEditando.id, formValue)
      : this.sobreNosotrosService.crearHito(formValue);

    request.subscribe({
      next: () => {
        this.isSavingHito = false;
        this.mostrarFormHito = false;
        this.cargarHitos();
        this.empresaInfoService.refreshPublicInfo();
      },
      error: (error) => {
        this.isSavingHito = false;
        mostrarErrorGuardado(error, 'el hito');
      },
    });
  }

  eliminarHito(hito: EmpresaHito): void {
    Swal.fire({
      title: '¿Eliminar hito?',
      html: `Estás a punto de eliminar el hito de <strong>${hito.anio}</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.sobreNosotrosService.eliminarHito(hito.id).subscribe({
          next: () => this.cargarHitos(),
          error: () =>
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el hito.',
              icon: 'error',
              confirmButtonColor: '#dc3545',
            }),
        });
      }
    });
  }

  // ==================================================
  // PREMIOS
  // ==================================================
  cargarPremios(): void {
    this.isLoadingPremios = true;
    this.sobreNosotrosService.obtenerPremios().subscribe({
      next: (premios) => {
        this.premios = premios;
        this.isLoadingPremios = false;
      },
      error: () => {
        this.isLoadingPremios = false;
      },
    });
  }

  nuevoPremio(): void {
    this.premioEditando = null;
    this.premioForm.reset({ titulo: '', anio: '', orden: this.premios.length, activo: true });
    this.premioImagenSeleccionada = null;
    this.premioImagenPreview = null;
    this.mostrarFormPremio = true;
  }

  editarPremio(premio: EmpresaPremio): void {
    this.premioEditando = premio;
    this.premioForm.patchValue({
      titulo: premio.titulo,
      anio: premio.anio || '',
      orden: premio.orden,
      activo: premio.activo,
    });
    this.premioImagenSeleccionada = null;
    this.premioImagenPreview = premio.imagen_url || null;
    this.mostrarFormPremio = true;
  }

  cancelarFormPremio(): void {
    this.mostrarFormPremio = false;
    this.premioEditando = null;
  }

  onPremioImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.premioImagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.premioImagenPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  guardarPremio(): void {
    if (!this.premioForm.valid) {
      this.premioForm.markAllAsTouched();
      return;
    }

    this.isSavingPremio = true;
    const formValue = {
      ...this.premioForm.value,
      imagen: this.premioImagenSeleccionada || undefined,
    };

    const request = this.premioEditando
      ? this.sobreNosotrosService.actualizarPremio(this.premioEditando.id, formValue)
      : this.sobreNosotrosService.crearPremio(formValue);

    request.subscribe({
      next: () => {
        this.isSavingPremio = false;
        this.mostrarFormPremio = false;
        this.cargarPremios();
        this.empresaInfoService.refreshPublicInfo();
      },
      error: (error) => {
        this.isSavingPremio = false;
        mostrarErrorGuardado(error, 'el premio');
      },
    });
  }

  eliminarPremio(premio: EmpresaPremio): void {
    Swal.fire({
      title: '¿Eliminar premio?',
      html: `Estás a punto de eliminar <strong>"${premio.titulo}"</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.sobreNosotrosService.eliminarPremio(premio.id).subscribe({
          next: () => this.cargarPremios(),
          error: () =>
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el premio.',
              icon: 'error',
              confirmButtonColor: '#dc3545',
            }),
        });
      }
    });
  }
}
