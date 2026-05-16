import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TiposPrecioService, TipoPrecio } from '../../services/tipos-precio.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipos-precio-modal',
  standalone: true,
  imports: [CommonModule],
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

          <div class="modal-body p-24" style="background:#f7f7f8; max-height:72vh; overflow-y:auto;">
            <!-- Leyenda -->
            <div class="d-flex flex-wrap gap-12 mb-20">
              <span class="leyenda-chip">
                <span class="dot dot--main"></span>
                <strong>Predeterminada</strong>: clientes registrados sin lista propia
              </span>
              <span class="leyenda-chip">
                <span class="dot dot--info"></span>
                <strong>Invitados</strong>: visitantes sin iniciar sesión
              </span>
            </div>

            <div *ngIf="loading" class="text-center py-40">
              <div class="spinner-border" style="color:#c22026;" role="status"></div>
            </div>

            <div *ngIf="!loading" class="d-flex flex-column gap-12">
              <div *ngFor="let t of tipos" class="tp-card" [class.tp-card--off]="!t.activo">
                <!-- Info -->
                <div class="tp-card__info">
                  <div class="d-flex align-items-center gap-8 flex-wrap">
                    <span class="tp-card__nombre">{{ t.nombre }}</span>
                    <span class="tp-moneda">{{ t.tipo_moneda === 'd' ? 'US$' : 'S/' }}</span>
                    <span *ngIf="t.es_predeterminado" class="tp-tag tp-tag--main">
                      <i class="ph-fill ph-star"></i> Predeterminada
                    </span>
                    <span *ngIf="t.es_para_invitados" class="tp-tag tp-tag--info">
                      <i class="ph-fill ph-user"></i> Invitados
                    </span>
                  </div>
                  <div class="tp-card__sub">{{ t.productos_count }} productos con precio</div>
                </div>

                <!-- Acciones -->
                <div class="tp-card__actions">
                  <!-- Switch activo -->
                  <button class="tp-switch" [class.tp-switch--on]="t.activo"
                          (click)="toggleActivo(t)"
                          [title]="t.activo ? 'Desactivar lista' : 'Activar lista'">
                    <span class="tp-switch__knob"></span>
                  </button>
                  <span class="tp-estado" [class.tp-estado--on]="t.activo">
                    {{ t.activo ? 'Activa' : 'Inactiva' }}
                  </span>

                  <button class="tp-btn"
                    [disabled]="!t.activo"
                    [class.tp-btn--main]="t.es_predeterminado"
                    [class.tp-btn--main-out]="!t.es_predeterminado"
                    (click)="marcarPredeterminado(t)">
                    <i class="ph" [ngClass]="t.es_predeterminado ? 'ph-check-circle' : 'ph-circle'"></i>
                    Predeterminada
                  </button>

                  <button class="tp-btn"
                    [disabled]="!t.activo"
                    [class.tp-btn--info]="t.es_para_invitados"
                    [class.tp-btn--info-out]="!t.es_para_invitados"
                    (click)="marcarInvitados(t)">
                    <i class="ph" [ngClass]="t.es_para_invitados ? 'ph-check-circle' : 'ph-circle'"></i>
                    Invitados
                  </button>
                </div>
              </div>

              <div *ngIf="tipos.length === 0" class="text-center text-gray-500 py-40">
                <i class="ph ph-tag d-block mb-8" style="font-size:36px;"></i>
                No hay tipos de precio. Ejecuta la sincronización con 7Power.
              </div>
            </div>

            <div class="mt-16" *ngIf="!loading && tipos.length > 0">
              <button class="btn btn-outline-secondary btn-sm rounded-8" (click)="quitarInvitados()">
                <i class="ph ph-eye-slash me-6"></i>
                Quitar lista de invitados (no mostrar precio a visitantes)
              </button>
            </div>
          </div>

          <div class="modal-footer border-top-0 px-32 py-16 bg-white">
            <button type="button" class="btn btn-secondary rounded-8" (click)="cerrar.emit()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { --rojo: #c22026; --rojo-dark: #a01a1f; --info: #0d6efd; }

    .leyenda-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      border: 1px solid #ececef;
      border-radius: 999px;
      padding: 7px 14px;
      font-size: 12.5px;
      color: #555;
    }
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

    .tp-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; border-radius: 999px; padding: 3px 10px;
    }
    .tp-tag--main { background: rgba(194,32,38,.12); color: var(--rojo); }
    .tp-tag--info { background: rgba(13,110,253,.12); color: var(--info); }

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

    .tp-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12.5px; font-weight: 600; border-radius: 999px;
      padding: 7px 16px; cursor: pointer; transition: all .15s;
      border: 1.5px solid transparent; white-space: nowrap;
    }
    .tp-btn:disabled { opacity: .4; cursor: not-allowed; }
    .tp-btn--main { background: var(--rojo); color: #fff; border-color: var(--rojo); }
    .tp-btn--main:hover:not(:disabled) { background: var(--rojo-dark); }
    .tp-btn--main-out { background: #fff; color: var(--rojo); border-color: rgba(194,32,38,.4); }
    .tp-btn--main-out:hover:not(:disabled) { background: rgba(194,32,38,.06); }
    .tp-btn--info { background: var(--info); color: #fff; border-color: var(--info); }
    .tp-btn--info:hover:not(:disabled) { background: #0b5ed7; }
    .tp-btn--info-out { background: #fff; color: var(--info); border-color: rgba(13,110,253,.4); }
    .tp-btn--info-out:hover:not(:disabled) { background: rgba(13,110,253,.06); }

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

  constructor(private service: TiposPrecioService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.service.listar().subscribe({
      next: (res) => { this.tipos = res.tipos_precio || []; this.loading = false; },
      error: () => { this.loading = false; Swal.fire('Error', 'No se pudieron cargar los tipos de precio', 'error'); },
    });
  }

  toggleActivo(t: TipoPrecio): void {
    this.service.toggleActivo(t.id).subscribe({
      next: () => this.cargar(),
      error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error'),
    });
  }

  marcarPredeterminado(t: TipoPrecio): void {
    if (!t.activo) return;
    this.service.marcarPredeterminado(t.id).subscribe({
      next: () => { this.cargar(); Swal.fire({ icon: 'success', title: 'Predeterminada actualizada', timer: 1400, showConfirmButton: false }); },
      error: (e) => Swal.fire('Error', e.error?.message || 'No se pudo actualizar', 'error'),
    });
  }

  marcarInvitados(t: TipoPrecio): void {
    if (!t.activo) return;
    this.service.marcarInvitados(t.id).subscribe({
      next: () => { this.cargar(); Swal.fire({ icon: 'success', title: 'Lista de invitados actualizada', timer: 1400, showConfirmButton: false }); },
      error: (e) => Swal.fire('Error', e.error?.message || 'No se pudo actualizar', 'error'),
    });
  }

  quitarInvitados(): void {
    this.service.quitarInvitados().subscribe({
      next: () => this.cargar(),
      error: () => Swal.fire('Error', 'No se pudo actualizar', 'error'),
    });
  }
}
