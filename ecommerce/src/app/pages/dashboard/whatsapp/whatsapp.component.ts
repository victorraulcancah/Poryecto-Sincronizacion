import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import { WhatsAppTemplateService, WhatsAppPlantilla } from '../../../services/whatsapp-template.service';

/**
 * Mensaje automático de WhatsApp que se manda al cliente cuando crea una
 * cotización/pedido desde el checkout, y vinculación del número (QR).
 *
 * El link del ecommerce NO se edita acá: siempre es el que configura el
 * backend (`config('whatsapp.link_ecommerce')`) — solo el texto es editable.
 */
@Component({
  selector: 'app-dashboard-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp.component.html',
  styleUrl: './whatsapp.component.scss',
})
export class WhatsappComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = false;
  guardando = false;
  desvinculando = false;

  contenido = '';
  activo = true;
  variables: string[] = [];
  linkEcommerce = '';
  habilitado = false;
  conexion: WhatsAppPlantilla['conexion'] | null = null;
  qrImagen: string | null = null;

  private readonly datosEjemplo: Record<string, string> = {
    nombre: 'Juan Pérez',
    codigo_cotizacion: 'COT-000123',
    codigo_pedido: 'PED-000123',
    total: 'S/ 149.90',
    link: 'https://tuecommerce.com',
  };

  constructor(private whatsappService: WhatsAppTemplateService) {}

  ngOnInit(): void {
    this.cargar();

    // Refresca solo el estado de conexión (no el mensaje) mientras la
    // página está abierta, para que el QR y el "Conectado" se vean sin
    // tener que recargar a mano.
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.actualizarEstado());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.isLoading = true;
    this.whatsappService
      .obtener()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.contenido = res.contenido;
          this.activo = res.activo;
          this.variables = res.variables ?? [];
          this.linkEcommerce = res.link_ecommerce;
          this.habilitado = res.habilitado;
          this.conexion = res.conexion;
          this.isLoading = false;
          this.generarQr();
        },
        error: error => {
          console.error('Error al cargar la configuración de WhatsApp:', error);
          this.isLoading = false;
          Swal.fire('Error', 'No se pudo cargar la configuración de WhatsApp', 'error');
        },
      });
  }

  /** Igual que `cargar()` pero sin tocar el mensaje/textarea — para el polling y el botón "Actualizar estado". */
  actualizarEstado(): void {
    this.whatsappService
      .obtener()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.habilitado = res.habilitado;
          this.conexion = res.conexion;
          this.generarQr();
        },
        error: error => console.error('Error al actualizar el estado de WhatsApp:', error),
      });
  }

  private generarQr(): void {
    this.qrImagen = null;
    if (this.conexion?.estado === 'esperando-qr' && this.conexion.qr) {
      QRCode.toDataURL(this.conexion.qr, { width: 260, margin: 1 })
        .then(url => (this.qrImagen = url))
        .catch(error => console.error('Error al generar el código QR:', error));
    }
  }

  /** Mismo texto con las variables reemplazadas por datos de ejemplo. */
  get vistaPrevia(): string {
    let texto = this.contenido || '';
    for (const variable of this.variables) {
      const valor = this.datosEjemplo[variable] ?? `{${variable}}`;
      texto = texto.split(`{${variable}}`).join(valor);
    }
    return texto;
  }

  get estadoTexto(): string {
    switch (this.conexion?.estado) {
      case 'conectado':
        return 'Conectado';
      case 'esperando-qr':
        return 'Esperando que escanees el QR';
      case 'desconectado':
        return 'Desconectado';
      default:
        return 'Sin conexión con el servicio de WhatsApp';
    }
  }

  insertarVariable(variable: string): void {
    this.contenido = `${this.contenido}{${variable}}`;
  }

  guardar(): void {
    if (!this.contenido.trim()) {
      Swal.fire({
        title: 'Falta el mensaje',
        text: 'Escribe el texto que se le enviará al cliente.',
        icon: 'warning',
        confirmButtonColor: '#d32027',
      });
      return;
    }

    this.guardando = true;
    this.whatsappService
      .actualizar(this.contenido.trim(), this.activo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando = false;
          Swal.fire({
            title: 'Mensaje actualizado',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: error => {
          this.guardando = false;
          Swal.fire({
            title: 'No se pudo guardar',
            text:
              error?.error?.errors?.contenido?.[0] ||
              error?.error?.message ||
              'Intenta nuevamente.',
            icon: 'error',
            confirmButtonColor: '#d32027',
          });
        },
      });
  }

  desvincular(): void {
    Swal.fire({
      title: '¿Vincular otro número?',
      text: 'Se cerrará la sesión de WhatsApp actual y habrá que escanear un código QR nuevo desde el celular que vayas a usar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desvincular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d32027',
    }).then(resultado => {
      if (!resultado.isConfirmed) return;

      this.desvinculando = true;
      this.whatsappService
        .desvincular()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.desvinculando = false;
            this.actualizarEstado();
          },
          error: error => {
            this.desvinculando = false;
            Swal.fire('Error', error?.error?.message || 'No se pudo desvincular.', 'error');
          },
        });
    });
  }
}
