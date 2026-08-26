import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import {
  ContactoService,
  MensajeContacto,
} from '../../../services/contacto.service';
import { RangoFechasComponent } from '../../../components/rango-fechas/rango-fechas.component';

/**
 * Bandeja de los mensajes que llegan del formulario público "Contáctanos".
 * Permite verlos, marcarlos como leídos, corregir los datos y borrarlos.
 */
@Component({
  selector: 'app-mensajes-contacto',
  standalone: true,
  imports: [CommonModule, FormsModule, RangoFechasComponent],
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

  /** Rango de fechas (YYYY-MM-DD), lo filtra el servidor. */
  desde = '';
  hasta = '';
  descargando = false;

  /**
   * Por defecto es una bandeja: lo leído sale de la lista a medianoche. Con
   * esto activado se ve todo el histórico.
   */
  historial = false;

  currentPage = 1;
  totalPages = 1;
  total = 0;

  /** Mensaje abierto en el modal (solo lectura). */
  seleccionado: MensajeContacto | null = null;

  constructor(private contactoService: ContactoService) {}

  ngOnInit(): void {
    this.cargar();
    // Al entrar a la bandeja se resincroniza el badge del menú.
    this.contactoService
      .refrescarNoLeidos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: () => {} });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(pagina = 1): void {
    this.isLoading = true;
    this.currentPage = pagina;

    this.contactoService
      .listar({
        page: pagina,
        per_page: 20,
        solo_no_leidos: this.soloNoLeidos,
        desde: this.desde,
        hasta: this.hasta,
        historial: this.historial,
      })
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

  // --------------------------------------------------------------- filtros

  /** Llega del selector de rango; vuelve a pedir la primera página. */
  cambiarRango(rango: { desde: string; hasta: string }): void {
    this.desde = rango.desde;
    this.hasta = rango.hasta;
    this.cargar(1);
  }

  limpiarFiltros(): void {
    this.desde = '';
    this.hasta = '';
    this.busqueda = '';
    this.soloNoLeidos = false;
    this.historial = false;
    this.cargar(1);
  }

  get hayFiltros(): boolean {
    return !!(
      this.desde ||
      this.hasta ||
      this.busqueda.trim() ||
      this.soloNoLeidos ||
      this.historial
    );
  }

  /**
   * Descarga los mensajes con los filtros puestos. El navegador no puede
   * seguir la URL directo porque el endpoint exige el token de sesión, así
   * que se baja como blob y se dispara la descarga a mano.
   */
  descargar(): void {
    this.descargando = true;

    this.contactoService
      .exportar({
        solo_no_leidos: this.soloNoLeidos,
        desde: this.desde,
        hasta: this.hasta,
        buscar: this.busqueda,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (archivo) => {
          this.descargando = false;

          const url = URL.createObjectURL(archivo);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `mensajes-contacto-${new Date().toISOString().slice(0, 10)}.csv`;
          enlace.click();
          URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.descargando = false;
          console.error('Error al exportar los mensajes de contacto:', error);
          Swal.fire('Error', 'No se pudo generar el archivo', 'error');
        },
      });
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
          const cambio = mensaje.leido === actualizado.leido ? 0 : actualizado.leido ? -1 : 1;
          mensaje.leido = actualizado.leido;

          // El badge del menú baja (o sube) al instante, sin volver a consultar.
          if (cambio) this.contactoService.ajustarNoLeidos(cambio);

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
            // Si se borra uno sin leer, deja de contar en el badge.
            if (!mensaje.leido) this.contactoService.ajustarNoLeidos(-1);
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
