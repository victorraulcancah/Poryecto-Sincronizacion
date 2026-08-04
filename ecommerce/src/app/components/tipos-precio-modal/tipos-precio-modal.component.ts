import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TiposPrecioService, TipoPrecio } from '../../services/tipos-precio.service';
import { AgregarListaPrecioModalComponent } from '../agregar-lista-precio-modal/agregar-lista-precio-modal.component';
import Swal from 'sweetalert2';

type Categoria = 'visitante' | 'vinculado';

@Component({
  selector: 'app-tipos-precio-modal',
  standalone: true,
  imports: [CommonModule, AgregarListaPrecioModalComponent],
  template: `
    <div class="modal show d-block" tabindex="-1"
      style="position: fixed; inset: 0; width: 100vw; height: 100vh; display: flex;
             align-items: center; justify-content: center; background: rgba(0,0,0,0.6);
             z-index: 99999; padding: 20px;"
      (click)="cerrar.emit()">
      <div class="modal-dialog modal-xl" (click)="$event.stopPropagation()"
        style="margin: 0 auto; max-width: 920px; width: 100%;">
        <div class="modal-content border-0 rounded-16 overflow-hidden">

          <!-- Header rojo -->
          <div class="modal-header border-bottom-0 px-32 py-20"
               style="background: linear-gradient(135deg, #c22026 0%, #a01a1f 100%);">
            <div class="d-flex align-items-center gap-16">
              <div class="w-48 h-48 rounded-circle flex-center" style="background: rgba(255,255,255,0.18);">
                <i class="ph-bold ph-tag text-white text-xl"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold mb-0 text-white">Tipos de Precio (global)</h5>
                <small class="text-white" style="opacity:0.8;">
                  Define qué lista usan los clientes registrados y los visitantes
                </small>
              </div>
            </div>
            <button type="button" class="btn-close btn-close-white" (click)="cerrar.emit()"></button>
          </div>

          <!-- Pestañas + botón Lista + -->
          <div class="d-flex align-items-center justify-content-between px-32 pt-16 bg-white border-bottom">
            <div class="d-flex gap-24">
              <button type="button" class="tp-tab" [class.tp-tab--active-visitante]="tabActiva === 'visitante'"
                (click)="tabActiva = 'visitante'">
                <span class="dot dot--main"></span>
                Clientes visitantes
              </button>
              <button type="button" class="tp-tab" [class.tp-tab--active-vinculado]="tabActiva === 'vinculado'"
                (click)="tabActiva = 'vinculado'">
                <span class="dot dot--info"></span>
                Clientes vinculados
              </button>
            </div>
            <button type="button" class="tp-lista-btn mb-8" (click)="mostrandoAgregarLista = true">
              <i class="ph-bold ph-plus me-4"></i>
              Lista
            </button>
          </div>

          <div class="modal-body p-24" style="background:#f7f7f8; max-height:65vh; overflow-y:auto;">
            <!-- Explicación de la pestaña activa -->
            <div class="tp-hint mb-20" *ngIf="tabActiva === 'visitante'">
              Permite agregar listas de precio, pero solo se puede activar 1 en soles y 1 en dólares.
              Es la lista que ven los clientes registrados sin vincular y los visitantes no logueados.
            </div>
            <div class="tp-hint mb-20" *ngIf="tabActiva === 'vinculado'">
              Permite agregar varias listas y activar las que se requieran. Estas listas aparecerán
              en Avanzado del cliente después de vincular su cuenta a Novik.
            </div>

            <div *ngIf="loading" class="text-center py-40">
              <div class="spinner-border" style="color:#c22026;" role="status"></div>
            </div>

            <div *ngIf="!loading" class="d-flex flex-column gap-12">
              <div *ngFor="let t of tiposDeTabActiva" class="tp-card" [class.tp-card--off]="!estaActiva(t)">
                <!-- Info -->
                <div class="tp-card__info">
                  <div class="d-flex align-items-center gap-8 flex-wrap">
                    <span class="tp-card__nombre">{{ t.nombre }}</span>
                    <span class="tp-moneda">{{ t.tipo_moneda === 'd' ? 'US$' : 'S/' }}</span>
                  </div>
                  <div class="tp-card__sub">{{ t.productos_count }} productos con precio</div>
                </div>

                <!-- Acciones -->
                <div class="tp-card__actions">
                  <button class="tp-switch" [class.tp-switch--on]="estaActiva(t)"
                          (click)="toggle(t)"
                          [title]="estaActiva(t) ? 'Desactivar lista' : 'Activar lista'">
                    <span class="tp-switch__knob"></span>
                  </button>
                  <span class="tp-estado" [class.tp-estado--on]="estaActiva(t)">
                    {{ estaActiva(t) ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
              </div>

              <div *ngIf="tiposDeTabActiva.length === 0" class="text-center text-gray-500 py-40">
                <i class="ph ph-tag d-block mb-8" style="font-size:36px;"></i>
                No hay listas en esta pestaña. Usa "Lista +" para traerlas desde Novik.
              </div>
            </div>
          </div>

          <div class="modal-footer border-top-0 px-32 py-16 bg-white">
            <button type="button" class="btn btn-secondary rounded-8" (click)="cerrar.emit()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <app-agregar-lista-precio-modal
      *ngIf="mostrandoAgregarLista"
      [tab]="tabActiva"
      (cerrar)="mostrandoAgregarLista = false"
      (guardado)="mostrandoAgregarLista = false; cargar()">
    </app-agregar-lista-precio-modal>
  `,
  styles: [`
    :host { --rojo: #c22026; --rojo-dark: #a01a1f; --info: #0d6efd; }

    .tp-tab {
      display: inline-flex; align-items: center; gap: 8px;
      border: none; background: none; padding: 4px 0 12px 0;
      font-weight: 700; font-size: 14.5px; color: #8a8f98;
      border-bottom: 2px solid transparent; cursor: pointer;
    }
    .tp-tab--active-visitante { color: var(--rojo); border-bottom-color: var(--rojo); }
    .tp-tab--active-vinculado { color: var(--info); border-bottom-color: var(--info); }

    .tp-lista-btn {
      display: inline-flex; align-items: center;
      border: none; background: none; color: #1f2329;
      font-weight: 700; font-size: 15px; cursor: pointer; padding: 4px 0;
    }
    .tp-lista-btn:disabled { opacity: .5; cursor: not-allowed; }

    .tp-hint { font-size: 12.5px; color: #6b7280; }

    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot--main { background: var(--rojo); }
    .dot--info { background: var(--info); }

    .tp-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #fff;
      border: 1px solid #ececef;
      border-radius: 14px;
      padding: 16px 20px;
      transition: box-shadow .15s, border-color .15s;
      flex-wrap: wrap;
    }
    .tp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
    .tp-card--off { background: #fafafa; opacity: .75; }

    .tp-card__info { min-width: 0; flex: 1 1 240px; }
    .tp-card__nombre { font-weight: 700; font-size: 15px; color: #1f2329; }
    .tp-card__sub { font-size: 12px; color: #8a8f98; margin-top: 4px; }

    .tp-moneda {
      font-size: 11px; font-weight: 700; color: #6b7280;
      background: #f1f1f3; border-radius: 6px; padding: 2px 8px;
    }

    .tp-card__actions {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }

    /* Switch activo */
    .tp-switch {
      position: relative; width: 42px; height: 24px; border-radius: 999px;
      border: none; background: #d1d5db; cursor: pointer; padding: 0;
      transition: background .2s; flex-shrink: 0;
    }
    .tp-switch--on { background: #16a34a; }
    .tp-switch__knob {
      position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
      background: #fff; border-radius: 50%; transition: left .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.3);
    }
    .tp-switch--on .tp-switch__knob { left: 21px; }
    .tp-estado { font-size: 12px; font-weight: 600; color: #9ca3af; min-width: 52px; }
    .tp-estado--on { color: #16a34a; }

    @media (max-width: 640px) {
      .tp-card { flex-direction: column; align-items: stretch; }
      .tp-card__actions { justify-content: space-between; }
    }
  `],
})
export class TiposPrecioModalComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();

  tipos: TipoPrecio[] = [];
  loading = false;
  tabActiva: Categoria = 'visitante';
  mostrandoAgregarLista = false;

  constructor(private service: TiposPrecioService) {}

  // Swal por encima del modal (el modal usa z-index 99999)
  private swal = Swal.mixin({
    didOpen: () => {
      const c = document.querySelector('.swal2-container') as HTMLElement | null;
      if (c) { c.style.zIndex = '100050'; }
    },
  });

  ngOnInit(): void {
    this.cargar();
  }

  get tiposDeTabActiva(): TipoPrecio[] {
    return this.tipos.filter(t => t.categoria === this.tabActiva);
  }

  /** "Activa" significa cosas distintas según la pestaña: en visitantes es
   * la lista elegida (predeterminada + invitados); en vinculados es `activo`. */
  estaActiva(t: TipoPrecio): boolean {
    return t.categoria === 'visitante' ? (t.es_predeterminado && t.es_para_invitados) : t.activo;
  }

  toggle(t: TipoPrecio): void {
    const accion = t.categoria === 'visitante'
      ? this.service.toggleVisitante(t.id)
      : this.service.toggleVinculado(t.id);

    accion.subscribe({
      next: () => this.cargar(),
      error: (e) => this.swal.fire('Error', e.error?.message || 'No se pudo cambiar el estado', 'error'),
    });
  }

  cargar(): void {
    this.loading = true;
    this.service.listar().subscribe({
      next: (res) => { this.tipos = res.tipos_precio || []; this.loading = false; },
      error: () => { this.loading = false; this.swal.fire('Error', 'No se pudieron cargar los tipos de precio', 'error'); },
    });
  }
}
