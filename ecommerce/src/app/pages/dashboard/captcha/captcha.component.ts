import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import {
  CaptchaService,
  CaptchaImagen,
  OPCIONES_PIEZAS,
} from '../../../services/captcha.service';

/**
 * Imágenes del rompecabezas del registro.
 *
 * Antes estaban pegadas en el código como enlaces a sitios ajenos; si se caían,
 * las piezas salían en blanco y nadie podía registrarse. Desde aquí se suben,
 * se activan y se borran.
 */
@Component({
  selector: 'app-dashboard-captcha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.scss',
})
export class CaptchaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  imagenes: CaptchaImagen[] = [];
  activas = 0;
  isLoading = false;

  /** 2, 4, 6 u 8, con su cuadrícula. */
  readonly opcionesPiezas = OPCIONES_PIEZAS;

  // Formulario de subida
  mostrandoFormulario = false;
  nombreNuevo = '';
  piezasNuevo = 4;
  archivoNuevo: File | null = null;
  previewNuevo: string | null = null;
  subiendo = false;

  /** Cuadrícula de una cantidad de piezas, para dibujar la vista previa. */
  cuadricula(piezas: number): { columnas: number; filas: number } {
    const opcion = this.opcionesPiezas.find(o => o.valor === piezas);
    return opcion ?? { columnas: 2, filas: 2 };
  }

  /** Celdas de la rejilla que se pinta encima de la imagen. */
  celdas(piezas: number): number[] {
    return Array.from({ length: piezas || 4 }, (_, i) => i);
  }

  /**
   * Es la única activa que queda. Se usa para bloquear el interruptor en vez
   * de dejar pulsarlo y devolver un error del servidor.
   */
  esUltimaActiva(imagen: CaptchaImagen): boolean {
    return imagen.activo && this.activas <= 1;
  }

  /** Abre la imagen completa, para revisarla antes de dejarla activa. */
  verImagen(imagen: CaptchaImagen): void {
    Swal.fire({
      title: imagen.nombre,
      imageUrl: this.urlImagen(imagen.ruta),
      imageAlt: imagen.nombre,
      imageWidth: 420,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#d32027',
    });
  }

  constructor(private captchaService: CaptchaService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.isLoading = true;
    this.captchaService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.imagenes = res.imagenes ?? [];
          this.activas = res.activas ?? 0;
          this.isLoading = false;
        },
        error: error => {
          console.error('Error al cargar las imágenes del captcha:', error);
          this.isLoading = false;
        },
      });
  }

  urlImagen(ruta: string): string {
    return this.captchaService.urlImagen(ruta);
  }

  // ── Subida ─────────────────────────────────────────────────────────

  abrirFormulario(): void {
    this.mostrandoFormulario = true;
    this.nombreNuevo = '';
    this.piezasNuevo = 4;
    this.archivoNuevo = null;
    this.previewNuevo = null;
  }

  cerrarFormulario(): void {
    this.mostrandoFormulario = false;
    this.previewNuevo = null;
    this.archivoNuevo = null;
  }

  onArchivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;

    // El mismo tope que valida el backend.
    if (archivo.size > 4 * 1024 * 1024) {
      Swal.fire({
        title: 'Imagen muy pesada',
        text: 'La imagen no puede pasar de 4 MB.',
        icon: 'warning',
        confirmButtonColor: '#d32027',
      });
      input.value = '';
      return;
    }

    this.archivoNuevo = archivo;
    if (!this.nombreNuevo.trim()) {
      this.nombreNuevo = archivo.name.replace(/\.[^.]+$/, '');
    }

    const lector = new FileReader();
    lector.onload = () => (this.previewNuevo = lector.result as string);
    lector.readAsDataURL(archivo);
  }

  guardar(): void {
    if (!this.nombreNuevo.trim() || !this.archivoNuevo) {
      Swal.fire({
        title: 'Faltan datos',
        text: 'Ponle un nombre y elige la imagen.',
        icon: 'warning',
        confirmButtonColor: '#d32027',
      });
      return;
    }

    this.subiendo = true;
    this.captchaService
      .crear(this.nombreNuevo.trim(), this.archivoNuevo, this.piezasNuevo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.subiendo = false;
          this.cerrarFormulario();
          this.cargar();
          Swal.fire({
            title: 'Imagen agregada',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: error => {
          this.subiendo = false;
          console.error('Error al subir la imagen del captcha:', error);
          Swal.fire({
            title: 'No se pudo subir',
            text: error?.error?.message || 'Revisa el formato y el tamaño de la imagen.',
            icon: 'error',
            confirmButtonColor: '#d32027',
          });
        },
      });
  }

  // ── Activar / desactivar y borrar ──────────────────────────────────

  alternarActivo(imagen: CaptchaImagen): void {
    const nuevoValor = !imagen.activo;

    this.captchaService
      .actualizar(imagen.id, { activo: nuevoValor })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          imagen.activo = nuevoValor;
          this.activas += nuevoValor ? 1 : -1;
        },
        error: error => {
          Swal.fire({
            title: 'No se pudo cambiar',
            text: error?.error?.message || 'Intenta nuevamente.',
            icon: 'error',
            confirmButtonColor: '#d32027',
          });
        },
      });
  }

  /** Cambia en cuántas piezas se parte esa imagen. */
  cambiarPiezas(imagen: CaptchaImagen, piezas: number): void {
    const anterior = imagen.piezas;
    imagen.piezas = Number(piezas);

    this.captchaService
      .actualizar(imagen.id, { piezas: imagen.piezas })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: error => {
          imagen.piezas = anterior;
          Swal.fire({
            title: 'No se pudo cambiar',
            text: error?.error?.message || 'Intenta nuevamente.',
            icon: 'error',
            confirmButtonColor: '#d32027',
          });
        },
      });
  }

  eliminar(imagen: CaptchaImagen): void {
    Swal.fire({
      title: '¿Eliminar la imagen?',
      text: `Se borrará "${imagen.nombre}" y dejará de salir en el registro.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d32027',
    }).then(resultado => {
      if (!resultado.isConfirmed) return;

      this.captchaService
        .eliminar(imagen.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.imagenes = this.imagenes.filter(i => i.id !== imagen.id);
            if (imagen.activo) this.activas--;
          },
          error: error => {
            Swal.fire({
              title: 'No se pudo eliminar',
              text: error?.error?.message || 'Intenta nuevamente.',
              icon: 'error',
              confirmButtonColor: '#d32027',
            });
          },
        });
    });
  }

  trackPorId = (_: number, imagen: CaptchaImagen) => imagen.id;
}
