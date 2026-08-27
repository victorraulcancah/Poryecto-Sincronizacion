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

  /**
   * Qué extremo se está editando. Con dos campos (Desde / Hasta) se puede
   * cambiar solo uno sin perder el otro: antes cualquier clic sobre un rango
   * ya armado lo borraba y obligaba a marcar las dos fechas de nuevo.
   */
  extremo: 'inicio' | 'fin' = 'inicio';

  /**
   * Casilla en la que el usuario puso el cursor, o null si abrió el panel con
   * el ícono del calendario. `extremo` no sirve para distinguirlo porque al
   * abrir con el ícono queda en 'inicio' de todas formas, y el atajo "Hoy"
   * necesita saberlo para decidir qué hacer (ver aplicarAtajo).
   */
  campoEnfocado: 'inicio' | 'fin' | null = null;

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  /** Ancho aproximado del panel, para no dejarlo salir de la pantalla. */
  private readonly anchoPanel = 690;

  /** La fecha inicial no puede ser futura: no hay movimientos por venir. */
  private readonly hoy = this.soloFecha(new Date());

  /** Atajos de rango, los mismos del filtro de reportes del ERP. */
  readonly atajos: { etiqueta: string; rango?: () => [Date, Date]; hoy?: boolean }[] = [
    { etiqueta: 'Hoy', rango: () => this.hastaHoy(), hoy: true },
    { etiqueta: 'Esta semana', rango: () => this.semanaActual() },
    { etiqueta: 'Última semana', rango: () => this.semanaAnterior() },
    { etiqueta: 'Este mes', rango: () => this.mesActual() },
    { etiqueta: 'Último mes', rango: () => this.mesAnteriorCompleto() },
    { etiqueta: 'Este año', rango: () => this.anioActual() },
    { etiqueta: 'Último año', rango: () => this.anioAnterior() },
  ];

  /**
   * "Hoy" hace dos cosas según desde dónde se abrió el panel:
   *
   *   - Con el cursor puesto en una de las dos casillas, autocompleta **esa**
   *     casilla con la fecha de hoy y deja el panel abierto para terminar de
   *     ajustar la otra.
   *   - Abierto con el ícono del calendario, arma el rango hasta hoy y aplica,
   *     igual que "Esta semana" o "Este mes".
   *
   * Los demás atajos siempre arman el rango completo y aplican.
   */
  aplicarAtajo(atajo: { rango?: () => [Date, Date]; hoy?: boolean }): void {
    if (atajo.hoy && this.campoEnfocado) {
      this.ponerHoyEnExtremo();
      return;
    }
    if (!atajo.rango) return;

    const [inicio, fin] = atajo.rango();
    this.seleccionInicio = inicio;
    this.seleccionFin = fin;
    this.sincronizarEntradas();
    // El panel se posiciona en el mes del inicio, para que se vea el rango.
    this.mesBase = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    this.confirmar();
  }

  /**
   * Desde la fecha elegida hasta hoy: si el cliente marcó el 01/08, el rango
   * queda 01/08 - 27/08 (hoy). Si no marcó nada, queda solo el día de hoy.
   */
  private hastaHoy(): [Date, Date] {
    return [this.seleccionInicio ?? this.hoy, this.hoy];
  }

  /**
   * Escribe la fecha de hoy en la casilla que tiene el cursor. No cierra el
   * panel: es un autocompletado del campo, igual que teclear la fecha a mano;
   * el rango se dispara recién con "Aplicar".
   */
  private ponerHoyEnExtremo(): void {
    const hoy = new Date(this.hoy);

    if (this.extremo === 'inicio') {
      this.seleccionInicio = hoy;
      // Mismo criterio que al elegir un día en el calendario: si el inicio se
      // pasa del fin, el fin deja de tener sentido y se suelta.
      if (this.seleccionFin && hoy > this.seleccionFin) this.seleccionFin = null;
    } else {
      this.seleccionFin = hoy;
      // Si quedó antes del inicio, se invierten en vez de romperse.
      if (this.seleccionInicio && hoy < this.seleccionInicio) {
        this.seleccionFin = this.seleccionInicio;
        this.seleccionInicio = hoy;
      }
    }

    this.sincronizarEntradas();
    this.mesBase = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  /** Lunes de la semana en curso hasta hoy. */
  private semanaActual(): [Date, Date] {
    return [this.lunesDe(this.hoy), this.hoy];
  }

  private semanaAnterior(): [Date, Date] {
    const lunes = this.lunesDe(this.hoy);
    lunes.setDate(lunes.getDate() - 7);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return [lunes, domingo];
  }

  private mesActual(): [Date, Date] {
    return [new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1), this.hoy];
  }

  private mesAnteriorCompleto(): [Date, Date] {
    const inicio = new Date(this.hoy.getFullYear(), this.hoy.getMonth() - 1, 1);
    const fin = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 0);
    return [inicio, fin];
  }

  private anioActual(): [Date, Date] {
    return [new Date(this.hoy.getFullYear(), 0, 1), this.hoy];
  }

  private anioAnterior(): [Date, Date] {
    return [
      new Date(this.hoy.getFullYear() - 1, 0, 1),
      new Date(this.hoy.getFullYear() - 1, 11, 31),
    ];
  }

  anioAnteriorVista(): void {
    this.mesBase = new Date(this.mesBase.getFullYear() - 1, this.mesBase.getMonth(), 1);
  }

  anioSiguienteVista(): void {
    this.mesBase = new Date(this.mesBase.getFullYear() + 1, this.mesBase.getMonth(), 1);
  }

  /** Lunes de la semana de una fecha (la semana arranca en lunes). */
  private lunesDe(fecha: Date): Date {
    const dia = fecha.getDay();
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() - (dia === 0 ? 6 : dia - 1));
    return this.soloFecha(lunes);
  }

  ngOnInit(): void {
    this.seleccionInicio = this.aFecha(this.desde);
    this.seleccionFin = this.aFecha(this.hasta);
    this.sincronizarEntradas();
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
    // Se abre editando el inicio, para que marcar un rango de corrido siga
    // funcionando como siempre. Sin casilla enfocada: se abrió con el ícono.
    this.extremo = 'inicio';
    this.campoEnfocado = null;
    this.hover = null;
    this.sincronizarEntradas();
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
      this.campoEnfocado = null;
    }
  }

  /** El panel está fijo en pantalla: si la página se mueve, deja de calzar. */
  @HostListener('window:resize')
  @HostListener('window:scroll')
  cerrarPorMovimiento(): void {
    this.abierto = false;
    this.campoEnfocado = null;
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
    // La grilla empieza el lunes de esa semana (domingo cuenta como día 7).
    const diaSemana = primero.getDay() === 0 ? 7 : primero.getDay();
    inicio.setDate(inicio.getDate() - (diaSemana - 1));

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
   * Solo se descartan los días de relleno del mes vecino. No se bloquean
   * fechas futuras: el filtro de reportes del ERP tampoco lo hace, y había
   * casos legítimos (pedidos programados, cuotas por vencer) que quedaban
   * fuera de alcance.
   */
  noSeleccionable(dia: Dia): boolean {
    return !dia.delMes;
  }

  /**
   * Se hizo foco en una de las dos casillas del filtro: se abre el calendario
   * (si estaba cerrado) y ese extremo pasa a ser el que se está editando.
   */
  abrirEn(cual: 'inicio' | 'fin'): void {
    if (!this.abierto) {
      this.ubicarPanel();
      this.abierto = true;
    }
    this.campoEnfocado = cual;
    this.editarExtremo(cual);
  }

  /** Pone el foco en un extremo para cambiar solo esa fecha. */
  editarExtremo(cual: 'inicio' | 'fin'): void {
    this.extremo = cual;
    this.hover = null;

    // Al ir a un extremo ya elegido, el calendario se mueve a su mes.
    const fecha = cual === 'inicio' ? this.seleccionInicio : this.seleccionFin;
    if (fecha) this.mesBase = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  elegir(dia: Dia): void {
    if (this.noSeleccionable(dia)) return;
    const f = this.soloFecha(dia.fecha);

    // Volver a clickear el día ya marcado lo desmarca. Sin esto, con el rango
    // ya armado el calendario no reaccionaba y no había forma de soltar una
    // fecha sin borrar las dos.
    const yaMarcado = this.extremo === 'inicio' ? this.seleccionInicio : this.seleccionFin;
    if (yaMarcado && this.mismoDia(f, yaMarcado)) {
      if (this.extremo === 'inicio') this.seleccionInicio = null;
      else this.seleccionFin = null;
      this.sincronizarEntradas();
      return;
    }

    if (this.extremo === 'inicio') {
      this.seleccionInicio = f;

      // Si el inicio se pasa del fin, el fin deja de tener sentido: se suelta
      // y el siguiente clic lo vuelve a marcar.
      if (this.seleccionFin && f > this.seleccionFin) this.seleccionFin = null;

      // Flujo normal de armar un rango de corrido: tras el inicio se pasa
      // solo al fin. Si el fin ya estaba puesto, no se mueve el foco: se
      // asume que solo se quería corregir el inicio.
      if (!this.seleccionFin) this.extremo = 'fin';
      this.sincronizarEntradas();
      return;
    }

    // Editando el fin.
    if (this.seleccionInicio && f < this.seleccionInicio) {
      // Eligió un fin anterior al inicio: se invierten en vez de romperse.
      this.seleccionFin = this.seleccionInicio;
      this.seleccionInicio = f;
      this.sincronizarEntradas();
      return;
    }

    this.seleccionFin = f;
    if (!this.seleccionInicio) this.seleccionInicio = f;
    this.sincronizarEntradas();
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

  /**
   * Texto de los campos del pie. Se guardan aparte de las fechas porque son
   * editables: mientras se escribe "0", "01", "01/0"… no hay fecha válida que
   * mostrar, y un getter derivado de la selección borraría lo tecleado.
   */
  entradaInicio = '';
  entradaFin = '';

  /** Refleja la selección en los campos de texto (dd/mm/aaaa). */
  private sincronizarEntradas(): void {
    this.entradaInicio = this.seleccionInicio ? this.formatoCorto(this.seleccionInicio) : '';
    this.entradaFin = this.seleccionFin ? this.formatoCorto(this.seleccionFin) : '';
  }

  /**
   * Lee un "dd/mm/aaaa" escrito a mano. Devuelve null mientras esté a medias
   * o si el día no existe (31/02 y similares).
   */
  private deTextoCorto(texto: string): Date | null {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
    if (!m) return null;

    const [, d, mes, a] = m.map(Number);
    const fecha = new Date(a, mes - 1, d);

    // new Date(2026, 1, 31) no falla: se corre al 3 de marzo. Se compara para
    // descartar esas fechas inventadas.
    const valida =
      fecha.getFullYear() === a && fecha.getMonth() === mes - 1 && fecha.getDate() === d;

    return valida ? fecha : null;
  }

  /** Se escribió una fecha a mano. Solo se aplica cuando queda completa. */
  escribir(cual: 'inicio' | 'fin', valor: string): void {
    if (cual === 'inicio') this.entradaInicio = valor;
    else this.entradaFin = valor;

    const fecha = this.deTextoCorto(valor);
    if (!fecha) return;

    if (cual === 'inicio') this.seleccionInicio = fecha;
    else this.seleccionFin = fecha;

    // Si quedaron cruzadas, se invierten.
    if (this.seleccionInicio && this.seleccionFin && this.seleccionInicio > this.seleccionFin) {
      const tmp = this.seleccionInicio;
      this.seleccionInicio = this.seleccionFin;
      this.seleccionFin = tmp;
      this.sincronizarEntradas();
    }

    this.mesBase = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }


  /** Día intermedio del rango (ya elegido o en previsualización con el mouse). */
  enRango(dia: Dia): boolean {
    if (!this.seleccionInicio || !dia.delMes) return false;

    // La previsualización con el mouse solo tiene sentido cuando falta el fin;
    // si el rango está completo, mover el cursor no debe repintarlo.
    const fin = this.seleccionFin ?? (this.extremo === 'fin' ? this.hover : null);
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
    this.extremo = 'inicio';
    this.campoEnfocado = null;
    this.sincronizarEntradas();
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
    this.campoEnfocado = null;
  }

  /** Texto del botón: "01/08/2026 — 07/08/2026". */

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
