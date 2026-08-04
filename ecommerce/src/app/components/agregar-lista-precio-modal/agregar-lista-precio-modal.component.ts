import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiposPrecioService, TipoPrecio } from '../../services/tipos-precio.service';
import Swal from 'sweetalert2';

type Categoria = 'visitante' | 'vinculado';

@Component({
  selector: 'app-agregar-lista-precio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal show d-block" tabindex="-1"
      style="position: fixed; inset: 0; width: 100vw; height: 100vh; display: flex;
             align-items: center; justify-content: center; background: rgba(0,0,0,0.6);
             z-index: 100010; padding: 20px;"
      (click)="cerrar.emit()">
      <div class="modal-dialog" (click)="$event.stopPropagation()" style="margin: 0 auto; max-width: 520px; width: 100%;">
        <div class="modal-content border-0 rounded-16 overflow-hidden">

          <div class="modal-header border-bottom-0 px-24 py-16" style="background:#f7f7f8;">
            <div>
              <h6 class="modal-title fw-bold mb-0">Agregar Lista de Precio</h6>
              <small class="text-muted">
                {{ tab === 'visitante'
                  ? 'Elige 1 lista en soles y 1 en dólares para clientes visitantes'
                  : 'Selecciona todas las listas que quieras habilitar para clientes vinculados' }}
              </small>
            </div>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>

          <div class="modal-body p-24" style="max-height:60vh; overflow-y:auto;">
            <div *ngIf="loading" class="text-center py-32">
              <div class="spinner-border" style="color:#c22026;" role="status"></div>
            </div>

            <ng-container *ngIf="!loading">
              <!-- Pestaña visitantes: un select por moneda -->
              <ng-container *ngIf="tab === 'visitante'">
                <div class="mb-16">
                  <label class="form-label fw-semibold">Lista en Soles (S/)</label>
                  <select class="form-select" [(ngModel)]="solesId">
                    <option [ngValue]="null">— Ninguna —</option>
                    <option *ngFor="let t of tiposSoles" [ngValue]="t.id">{{ t.nombre }} ({{ t.productos_count }} productos)</option>
                  </select>
                </div>
                <div class="mb-8">
                  <label class="form-label fw-semibold">Lista en Dólares (US$)</label>
                  <select class="form-select" [(ngModel)]="dolaresId">
                    <option [ngValue]="null">— Ninguna —</option>
                    <option *ngFor="let t of tiposDolares" [ngValue]="t.id">{{ t.nombre }} ({{ t.productos_count }} productos)</option>
                  </select>
                </div>
              </ng-container>

              <!-- Pestaña vinculados: checkboxes, cualquier cantidad -->
              <ng-container *ngIf="tab === 'vinculado'">
                <div class="d-flex flex-column gap-8">
                  <label *ngFor="let t of tipos" class="d-flex align-items-center gap-8 border rounded-8 px-12 py-8"
                    style="cursor:pointer;">
                    <input type="checkbox" class="form-check-input mt-0"
                      [checked]="seleccionados.has(t.id)"
                      (change)="toggleSeleccionado(t.id)">
                    <span class="flex-grow-1">{{ t.nombre }}</span>
                    <span class="tp-moneda">{{ t.tipo_moneda === 'd' ? 'US$' : 'S/' }}</span>
                    <span class="text-muted small">{{ t.productos_count }} prod.</span>
                  </label>

                  <div *ngIf="tipos.length === 0" class="text-center text-muted py-16">
                    No hay listas sincronizadas todavía.
                  </div>
                </div>
              </ng-container>

              <button type="button" class="btn btn-link btn-sm px-0 mt-12" [disabled]="sincronizando" (click)="resincronizar()">
                <span *ngIf="sincronizando" class="spinner-border spinner-border-sm me-6"></span>
                <i *ngIf="!sincronizando" class="ph ph-arrows-clockwise me-4"></i>
                Actualizar listas desde Novik
              </button>
            </ng-container>
          </div>

          <div class="modal-footer border-top-0 px-24 py-16">
            <button type="button" class="btn btn-secondary rounded-8" (click)="cerrar.emit()" [disabled]="guardando">Cancelar</button>
            <button type="button" class="btn btn-primary rounded-8" [disabled]="guardando || loading" (click)="guardar()">
              <span *ngIf="guardando" class="spinner-border spinner-border-sm me-6"></span>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tp-moneda {
      font-size: 11px; font-weight: 700; color: #6b7280;
      background: #f1f1f3; border-radius: 6px; padding: 2px 8px;
    }
  `],
})
export class AgregarListaPrecioModalComponent implements OnInit {
  @Input() tab: Categoria = 'visitante';
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  tipos: TipoPrecio[] = [];
  loading = false;
  guardando = false;
  sincronizando = false;

  // Visitantes
  solesId: number | null = null;
  dolaresId: number | null = null;

  // Vinculados
  seleccionados = new Set<number>();

  constructor(private service: TiposPrecioService) {}

  private swal = Swal.mixin({
    didOpen: () => {
      const c = document.querySelector('.swal2-container') as HTMLElement | null;
      if (c) { c.style.zIndex = '100060'; }
    },
  });

  ngOnInit(): void {
    this.cargar();
  }

  get tiposSoles(): TipoPrecio[] {
    return this.tipos.filter(t => t.tipo_moneda === 's');
  }

  get tiposDolares(): TipoPrecio[] {
    return this.tipos.filter(t => t.tipo_moneda === 'd');
  }

  cargar(): void {
    this.loading = true;
    this.service.listar().subscribe({
      next: (res) => {
        this.tipos = res.tipos_precio || [];
        this.loading = false;
        this.precargarSeleccion();
      },
      error: () => { this.loading = false; this.swal.fire('Error', 'No se pudieron cargar las listas', 'error'); },
    });
  }

  private precargarSeleccion(): void {
    const soles = this.tipos.find(t => t.categoria === 'visitante' && t.tipo_moneda === 's' && t.es_predeterminado && t.es_para_invitados);
    const dolares = this.tipos.find(t => t.categoria === 'visitante' && t.tipo_moneda === 'd' && t.es_predeterminado && t.es_para_invitados);
    this.solesId = soles?.id ?? null;
    this.dolaresId = dolares?.id ?? null;

    this.seleccionados = new Set(
      this.tipos.filter(t => t.categoria === 'vinculado' && t.activo).map(t => t.id)
    );
  }

  toggleSeleccionado(id: number): void {
    if (this.seleccionados.has(id)) {
      this.seleccionados.delete(id);
    } else {
      this.seleccionados.add(id);
    }
  }

  resincronizar(): void {
    this.sincronizando = true;
    this.service.resincronizar().subscribe({
      next: () => { this.sincronizando = false; this.cargar(); },
      error: () => { this.sincronizando = false; this.swal.fire('Error', 'No se pudo sincronizar con Novik', 'error'); },
    });
  }

  guardar(): void {
    this.guardando = true;
    const accion = this.tab === 'visitante'
      ? this.service.asignarVisitantes(this.solesId, this.dolaresId)
      : this.service.asignarVinculados(Array.from(this.seleccionados));

    accion.subscribe({
      next: () => {
        this.guardando = false;
        this.guardado.emit();
      },
      error: (e) => {
        this.guardando = false;
        this.swal.fire('Error', e.error?.message || 'No se pudo guardar', 'error');
      },
    });
  }
}
