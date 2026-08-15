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
  guardando = false;

  /** Búsqueda por nombre, correo o asunto (se filtra en el cliente). */
  busqueda = '';
  soloNoLeidos = false;

  currentPage = 1;
  totalPages = 1;
  total = 0;

  /** Mensaje abierto en el modal; `edicion` es la copia que se edita. */
  seleccionado: MensajeContacto | null = null;
  edicion: Partial<MensajeContacto> = {};
  modoEdicion = false;

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
    this.edicion = { ...mensaje };
    this.modoEdicion = false;

    // Abrirlo cuenta como leerlo.
    if (!mensaje.leido) this.marcarLeido(mensaje, true, false);
  }

  cerrarModal(): void {
    this.seleccionado = null;
    this.modoEdicion = false;
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

  guardar(): void {
    if (!this.seleccionado || this.guardando) return;
    this.guardando = true;

    this.contactoService
      .actualizar(this.seleccionado.id, {
        nombre: this.edicion.nombre,
        email: this.edicion.email,
        telefono: this.edicion.telefono,
        asunto: this.edicion.asunto,
        mensaje: this.edicion.mensaje,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (actualizado) => {
          this.guardando = false;
          this.mensajes = this.mensajes.map((m) =>
            m.id === actualizado.id ? actualizado : m
          );
          this.seleccionado = actualizado;
          this.modoEdicion = false;
          Swal.fire('Guardado', 'El mensaje se actualizó', 'success');
        },
        error: (error) => {
          this.guardando = false;
          console.error('Error al guardar el mensaje:', error);
          Swal.fire('Error', 'No se pudo guardar el mensaje', 'error');
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

  responderPorCorreo(mensaje: MensajeContacto): void {
    const asunto = encodeURIComponent(`Re: ${mensaje.asunto}`);
    window.location.href = `mailto:${mensaje.email}?subject=${asunto}`;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) this.cargar(pagina);
  }

  trackPorId = (_: number, mensaje: MensajeContacto) => mensaje.id;
}
