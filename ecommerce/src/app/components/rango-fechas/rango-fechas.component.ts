import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

type Dia = {
  fecha: Date;
  /** Pertenece al mes que se está pintando (los de relleno se ven grises). */
  delMes: boolean;
};

/**
 * Selector de rango de fechas.
 *
 * Reemplaza los dos `<input type="date">` nativos: muestra dos meses seguidos,
 * marca el rango elegido y trae botones "Borrar" y "Aplicar". El filtro no se
 * dispara hasta que se presiona "Aplicar".
 */
@Component({
  selector: 'app-rango-fechas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rango-fechas.component.html',
  styleUrl: './rango-fechas.component.scss',
})
export class RangoFechasComponent implements OnInit {
  /** Fechas iniciales en formato YYYY-MM-DD. */
  @Input() desde = '';
  @Input() hasta = '';

  @Output() aplicar = new EventEmitter<{ desde: string; hasta: string }>();

  @ViewChild('disparador') disparador?: ElementRef<HTMLElement>;

  abierto = false;

  /**
   * El panel se posiciona con `position: fixed` y coordenadas calculadas: la
   * tarjeta que contiene el filtro tiene `overflow-hidden`, y un panel
   * absoluto quedaría recortado dentro de ella.
   */
  posicion = { top: 0, left: 0 };

  /** Primer mes visible (el segundo es este + 1). */
  mesBase = new Date();

  seleccionInicio: Date | null = null;
  seleccionFin: Date | null = null;
  /** Día bajo el cursor, para previsualizar el rango mientras se elige. */
  hover: Date | null = null;

  readonly diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  /** Ancho aproximado del panel, para no dejarlo salir de la pantalla. */
  private readonly anchoPanel = 546;

  /** La fecha inicial no puede ser futura: no hay movimientos por venir. */
  private readonly hoy = this.soloFecha(new Date());

  /** La fecha final sí puede adelantarse, como mucho hasta fin de año. */
  private readonly finDeAnio = new Date(new Date().getFullYear(), 11, 31);

  ngOnInit(): void {
    this.seleccionInicio = this.aFecha(this.desde);
    this.seleccionFin = this.aFecha(this.hasta);
    // Abrir mostrando el mes de la fecha inicial elegida.
    if (this.seleccionInicio) {
      this.mesBase = new Date(this.seleccionInicio.getFullYear(), this.seleccionInicio.getMonth(), 1);
    } else {
      const hoy = new Date();
      this.mesBase = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
  }

  // ------------------------------------------------------------------ apertura

  alternar(): void {
    if (this.abierto) {
      this.abierto = false;
      return;
    }
    this.ubicarPanel();
    this.abierto = true;
  }

  /**
   * Cierre al hacer clic afuera.
   *
   * Se compara el elemento clickeado con `closest()` en lugar de cortar la
   * propagación en el disparador: la app usa hidratación con `withEventReplay`,
   * que reenvía los clics desde un listener global, así que `stopPropagation()`
   * no evitaba que este mismo clic cerrara el panel recién abierto.
   */
  @HostListener('document:click', ['$event'])
  cerrarPorFuera(event: MouseEvent): void {
    const destino = event.target as HTMLElement | null;
    if (!destino?.closest('.rango-fechas')) {
      this.abierto = false;
    }
  }

  /** El panel está fijo en pantalla: si la página se mueve, deja de calzar. */
  @HostListener('window:resize')
  @HostListener('window:scroll')
  cerrarPorMovimiento(): void {
    this.abierto = false;
  }

  private ubicarPanel(): void {
    const rect = this.disparador?.nativeElement.getBoundingClientRect();
    if (!rect) return;

    const maxIzquierda = window.innerWidth - this.anchoPanel - 8;
    this.posicion = {
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, maxIzquierda)),
    };
  }

  // -------------------------------------------------------------------- meses

  get mesSecundario(): Date {
    return new Date(this.mesBase.getFullYear(), this.mesBase.getMonth() + 1, 1);
  }

  nombreMes(fecha: Date): string {
    return this.meses[fecha.getMonth()];
  }

  mesAnterior(): void {
    this.mesBase = new Date(this.mesBase.getFullYear(), this.mesBase.getMonth() - 1, 1);
  }

  mesSiguiente(): void {
    this.mesBase = new Date(this.mesBase.getFullYear(), this.mesBase.getMonth() + 1, 1);
  }

  /** Cuadrícula de 6 semanas: incluye días de relleno del mes anterior/siguiente. */
  diasDe(mes: Date): Dia[] {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primero);
    inicio.setDate(inicio.getDate() - primero.getDay());

    const dias: Dia[] = [];
    for (let i = 0; i < 42; i++) {
      const f = new Date(inicio);
      f.setDate(inicio.getDate() + i);
      dias.push({ fecha: f, delMes: f.getMonth() === mes.getMonth() });
    }
    return dias;
  }

  /**
   * `diasDe()` devuelve objetos nuevos en cada ciclo de detección de cambios;
   * sin `trackBy` los 42 botones se destruirían y recrearían todo el tiempo, y
   * un botón recreado entre el mousedown y el mouseup no llega a emitir click.
   */
  trackDia = (_: number, dia: Dia) => dia.fecha.getTime();

  // --------------------------------------------------------------- selección

  /**
   * Un día que no se puede elegir: los de relleno de otro mes, los posteriores
   * a hoy mientras se elige la fecha inicial, y los de más allá de fin de año.
   */
  noSeleccionable(dia: Dia): boolean {
    if (!dia.delMes) return true;
    const limite = this.eligiendoInicio ? this.hoy : this.finDeAnio;
    return dia.fecha > limite;
  }

  /** El próximo clic define la fecha inicial (no hay rango a medias). */
  private get eligiendoInicio(): boolean {
    return !this.seleccionInicio || !!this.seleccionFin;
  }

  elegir(dia: Dia): void {
    if (this.noSeleccionable(dia)) return;
    const f = this.soloFecha(dia.fecha);

    // Sin inicio, o ya había un rango completo: se empieza de nuevo.
    if (!this.seleccionInicio || this.seleccionFin) {
      this.seleccionInicio = f;
      this.seleccionFin = null;
      return;
    }

    // Si la segunda fecha es anterior a la primera, se invierten.
    if (f < this.seleccionInicio) {
      this.seleccionFin = this.seleccionInicio;
      this.seleccionInicio = f;
    } else {
      this.seleccionFin = f;
    }
  }

  // Los días que se ven en el mes vecino (el 1 de agosto asomando en la
  // grilla de julio) no se marcan: si no, la misma fecha aparece resaltada dos
  // veces y parece que hay tres días elegidos.
  esInicio(dia: Dia): boolean {
    return dia.delMes && !!this.seleccionInicio && this.mismoDia(dia.fecha, this.seleccionInicio);
  }

  esFin(dia: Dia): boolean {
    return dia.delMes && !!this.seleccionFin && this.mismoDia(dia.fecha, this.seleccionFin);
  }

  /** Día intermedio del rango (ya elegido o en previsualización con el mouse). */
  enRango(dia: Dia): boolean {
    if (!this.seleccionInicio || !dia.delMes) return false;
    const fin = this.seleccionFin ?? this.hover;
    if (!fin) return false;

    const desde = this.seleccionInicio < fin ? this.seleccionInicio : fin;
    const hasta = this.seleccionInicio < fin ? fin : this.seleccionInicio;
    const f = this.soloFecha(dia.fecha);
    return f > desde && f < hasta;
  }

  esHoy(dia: Dia): boolean {
    return this.mismoDia(dia.fecha, new Date());
  }

  // ---------------------------------------------------------------- acciones

  borrar(): void {
    this.seleccionInicio = null;
    this.seleccionFin = null;
    this.hover = null;
  }

  confirmar(): void {
    if (!this.seleccionInicio) return;
    // Si solo se eligió una fecha, el rango es ese mismo día.
    const fin = this.seleccionFin ?? this.seleccionInicio;
    this.aplicar.emit({
      desde: this.aTexto(this.seleccionInicio),
      hasta: this.aTexto(fin),
    });
    this.abierto = false;
  }

  /** Texto del botón: "01/08/2026 — 07/08/2026". */
  get resumen(): string {
    if (!this.seleccionInicio) return 'Seleccionar fechas';
    const ini = this.formatoCorto(this.seleccionInicio);
    if (!this.seleccionFin) return ini;
    return `${ini} — ${this.formatoCorto(this.seleccionFin)}`;
  }

  // ---------------------------------------------------------------- utilidades

  private soloFecha(f: Date): Date {
    return new Date(f.getFullYear(), f.getMonth(), f.getDate());
  }

  private mismoDia(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /** 'YYYY-MM-DD' -> Date local (evita el corrimiento de zona horaria). */
  private aFecha(texto: string): Date | null {
    if (!texto) return null;
    const [a, m, d] = texto.split('-').map(Number);
    if (!a || !m || !d) return null;
    return new Date(a, m - 1, d);
  }

  private aTexto(f: Date): string {
    const mm = String(f.getMonth() + 1).padStart(2, '0');
    const dd = String(f.getDate()).padStart(2, '0');
    return `${f.getFullYear()}-${mm}-${dd}`;
  }

  private formatoCorto(f: Date): string {
    const mm = String(f.getMonth() + 1).padStart(2, '0');
    const dd = String(f.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${f.getFullYear()}`;
  }
}
