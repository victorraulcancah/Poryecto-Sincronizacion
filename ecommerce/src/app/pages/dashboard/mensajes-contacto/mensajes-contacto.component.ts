import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import {
  ContactoService,
  MensajeContacto,
} from '../../../services/contacto.service';

/**
 * Bandeja de los mensajes que llegan del formulario público "Contáctanos".
 * Permite verlos, marcarlos como leídos, corregir los datos y borrarlos.
 */
@Component({
  selector: 'app-mensajes-contacto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mensajes-contacto.component.html',
  styleUrl: './mensajes-contacto.component.scss',
})
export class MensajesContactoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  mensajes: MensajeContacto[] = [];
  isLoading = false;

  /** Búsqueda por nombre, correo o asunto (se filtra en el cliente). */
  busqueda = '';
  soloNoLeidos = false;

  currentPage = 1;
  totalPages = 1;
  total = 0;

  /** Mensaje abierto en el modal (solo lectura). */
  seleccionado: MensajeContacto | null = null;

  constructor(private contactoService: ContactoService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(pagina = 1): void {
    this.isLoading = true;
    this.currentPage = pagina;

    this.contactoService
      .listar({ page: pagina, per_page: 20, solo_no_leidos: this.soloNoLeidos })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.mensajes = res.data ?? [];
          this.totalPages = res.last_page ?? 1;
          this.total = res.total ?? this.mensajes.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar los mensajes de contacto:', error);
          this.isLoading = false;
        },
      });
  }

  get mensajesFiltrados(): MensajeContacto[] {
    if (!this.busqueda.trim()) return this.mensajes;
    const texto = this.busqueda.toLowerCase();
    return this.mensajes.filter(
      (m) =>
        m.nombre.toLowerCase().includes(texto) ||
        m.email.toLowerCase().includes(texto) ||
        m.asunto.toLowerCase().includes(texto)
    );
  }

  get noLeidos(): number {
    return this.mensajes.filter((m) => !m.leido).length;
  }

  // ------------------------------------------------------------- acciones
  ver(mensaje: MensajeContacto): void {
    this.seleccionado = mensaje;

    // Abrirlo cuenta como leerlo.
    if (!mensaje.leido) this.marcarLeido(mensaje, true, false);
  }

  cerrarModal(): void {
    this.seleccionado = null;
  }

  marcarLeido(mensaje: MensajeContacto, leido: boolean, avisar = true): void {
    this.contactoService
      .marcarLeido(mensaje.id, leido)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (actualizado) => {
          mensaje.leido = actualizado.leido;
          if (this.soloNoLeidos && actualizado.leido) this.cargar(this.currentPage);
        },
        error: (error) => {
          console.error('Error al cambiar el estado del mensaje:', error);
          if (avisar) {
            Swal.fire('Error', 'No se pudo cambiar el estado del mensaje', 'error');
          }
        },
      });
  }

  eliminar(mensaje: MensajeContacto): void {
    Swal.fire({
      title: '¿Eliminar mensaje?',
      text: `Se borrará el mensaje de ${mensaje.nombre}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.contactoService
        .eliminar(mensaje.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.mensajes = this.mensajes.filter((m) => m.id !== mensaje.id);
            this.total = Math.max(0, this.total - 1);
            if (this.seleccionado?.id === mensaje.id) this.cerrarModal();
            Swal.fire('Eliminado', 'El mensaje se eliminó', 'success');
          },
          error: (error) => {
            console.error('Error al eliminar el mensaje:', error);
            Swal.fire('Error', 'No se pudo eliminar el mensaje', 'error');
          },
        });
    });
  }

  /** `mailto:` con el asunto ya citado, para responder desde el correo. */
  enlaceCorreo(mensaje: MensajeContacto): string {
    const asunto = encodeURIComponent(`Re: ${mensaje.asunto}`);
    return `mailto:${mensaje.email}?subject=${asunto}`;
  }

  /** WhatsApp del remitente; los números peruanos van con el +51. */
  enlaceWhatsapp(mensaje: MensajeContacto): string | null {
    const digitos = (mensaje.telefono || '').replace(/\D/g, '');
    if (!digitos) return null;

    const numero = digitos.length === 9 ? `51${digitos}` : digitos;
    return `https://wa.me/${numero}`;
  }

  /** Iniciales para el círculo de la columna Cliente (como en Pedidos). */
  iniciales(nombre: string): string {
    return (nombre || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  /** Números de página que muestra la paginación. */
  get paginas(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) this.cargar(pagina);
  }

  trackPorId = (_: number, mensaje: MensajeContacto) => mensaje.id;
}
