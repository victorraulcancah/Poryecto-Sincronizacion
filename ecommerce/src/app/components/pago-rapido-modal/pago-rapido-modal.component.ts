import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PagoEntrada {
  totalPagar: number;
}

export interface PagoResultado {
  metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'YAPE' | 'PLIN';
  montoEntregado?: number; // para efectivo
  vuelto?: number;
  referencia?: string; // operación/últimos dígitos
  pagosMixtos?: PagoMixto[]; // para múltiples métodos de pago
}

export interface PagoMixto {
  metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'YAPE' | 'PLIN';
  monto: number;
  referencia?: string;
}

@Component({
  selector: 'app-pago-rapido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .modal-header-custom {
      background: var(--main-600);
      color: white;
      padding: 1.5rem;
      border-radius: 0;
    }
    .modal-header-custom .modal-title {
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .modal-header-custom .btn-close {
      filter: brightness(0) invert(1);
    }
    .totales-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #dee2e6;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .total-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }
    .total-label {
      font-size: 0.95rem;
      color: #6c757d;
      font-weight: 500;
    }
    .total-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .pago-item {
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease;
    }
    .pago-item:hover {
      border-color: var(--main-600);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .pago-metodo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .pago-icono {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .pago-nombre {
      font-weight: 600;
      font-size: 1rem;
      color: #212529;
    }
    .pago-monto {
      font-size: 1.25rem;
      font-weight: 700;
      color: #212529;
    }
    .form-agregar {
      background: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .form-agregar-title {
      font-weight: 600;
      font-size: 1rem;
      color: #495057;
      margin-bottom: 1rem;
    }
    .btn-agregar {
      background: #28a745;
      border: none;
      color: white;
      padding: 0.75rem;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-agregar:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
    .btn-agregar:disabled {
      background: #6c757d;
      opacity: 0.5;
    }
    .btn-confirmar {
      background: var(--main-600);
      border: none;
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.2s ease;
    }
    .btn-confirmar:hover:not(:disabled) {
      background: var(--main-700);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(var(--main-600-rgb, 13, 110, 253), 0.3);
    }
    .btn-confirmar:disabled {
      background: #6c757d;
      opacity: 0.5;
    }
    .btn-cancelar {
      background: white;
      border: 2px solid #dee2e6;
      color: #6c757d;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-cancelar:hover {
      border-color: #adb5bd;
      background: #f8f9fa;
    }
    .btn-eliminar {
      background: transparent;
      border: none;
      color: #dc3545;
      padding: 0.5rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    .btn-eliminar:hover {
      background: #fff5f5;
      color: #c82333;
    }
    .alert-pago-completo {
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      border: 2px solid #28a745;
      border-radius: 10px;
      padding: 1rem;
      margin-top: 1rem;
      color: #155724;
      font-weight: 600;
    }
  `],
  template: `
    <div class="modal show d-block" tabindex="-1" 
      style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; 
             width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; 
             justify-content: center !important; background-color: rgba(0,0,0,0.6) !important; z-index: 99999 !important; 
             padding: 20px !important; margin: 0 !important;" 
      (click)="cerrarModal()">
      <div class="modal-dialog" (click)="$event.stopPropagation()" 
        style="margin: 0 auto !important; max-width: 500px; width: 100%;">
        <div class="modal-content" style="border: none; border-radius: 16px; overflow: hidden;">
          <div class="modal-header modal-header-custom border-0">
            <h5 class="modal-title">
              <i class="fas fa-credit-card"></i>
              Métodos de Pago
            </h5>
            <button type="button" class="btn-close" (click)="cerrarModal()"></button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <!-- Resumen de Totales -->
            <div class="totales-card mb-4">
              <div class="row text-center">
                <div class="col-4">
                  <div class="total-label">Total Factura</div>
                  <div class="total-value" style="color: #212529;">S/ {{ totalPagar | number:'1.2-2' }}</div>
                </div>
                <div class="col-4">
                  <div class="total-label">Pagado</div>
                  <div class="total-value" style="color: #28a745;">S/ {{ totalPagado | number:'1.2-2' }}</div>
                </div>
                <div class="col-4">
                  <div class="total-label">Por Pagar</div>
                  <div class="total-value" [style.color]="restante > 0 ? '#dc3545' : '#28a745'">
                    S/ {{ restante | number:'1.2-2' }}
                  </div>
                </div>
              </div>
              <div *ngIf="pagoCompleto" class="alert-pago-completo">
                <i class="fas fa-check-circle me-2"></i>
                Pago completo. Puede confirmar la factura.
              </div>
            </div>

            <!-- Formulario para Agregar Pago -->
            <div class="form-agregar">
              <div class="form-agregar-title">
                <i class="fas fa-plus-circle me-2"></i>
                Agregar método de pago:
              </div>
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label fw-semibold" style="color: #495057;">Método de pago</label>
                  <select class="form-select form-select-lg" [(ngModel)]="nuevoMetodo" 
                          style="border: 2px solid #dee2e6; border-radius: 8px;">
                    <option value="" disabled>-- Seleccione un método --</option>
                    <option value="EFECTIVO">� Efecteivo</option>
                    <option value="TARJETA">💳 Tarjeta</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                    <option value="CREDITO">� Créd/ito</option>
                    <option value="YAPE">📱 Yape</option>
                    <option value="PLIN">📱 Plin</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold" style="color: #495057;">Monto a pagar</label>
                  <div class="input-group input-group-lg">
                    <span class="input-group-text" style="background: white; border: 2px solid #dee2e6; border-right: none;">S/</span>
                    <input type="number" class="form-control" [(ngModel)]="nuevoMonto" 
                           min="0" step="0.01" [max]="restante" placeholder="0.00"
                           style="border: 2px solid #dee2e6; border-left: none; border-right: none;">
                    <button type="button" class="btn btn-outline-primary" 
                            (click)="llenarRestante()" [disabled]="restante === 0"
                            style="border: 2px solid #dee2e6; border-left: none;">
                      Restante
                    </button>
                  </div>
                  <small class="text-muted">Máximo: S/ {{ restante | number:'1.2-2' }}</small>
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold" style="color: #495057;">
                    Referencia <span class="text-danger">*</span>
                  </label>
                  <input type="text" class="form-control form-control-lg" [(ngModel)]="nuevaReferencia" 
                         placeholder="N° operación / últimos dígitos"
                         style="border: 2px solid #dee2e6; border-radius: 8px;">
                  <small class="text-danger" *ngIf="nuevaReferencia.trim() === ''">Campo obligatorio</small>
                </div>
                <div class="col-12">
                  <button type="button" class="btn btn-agregar w-100" 
                          (click)="agregarPago()" [disabled]="!puedeAgregarPago()">
                    <i class="fas fa-plus me-2"></i>
                    Agregar este Pago
                  </button>
                </div>
              </div>
            </div>

            <!-- Lista de Pagos Registrados -->
            <div *ngIf="pagosMixtos.length > 0" class="mb-4">
              <h6 class="fw-bold mb-3" style="color: #495057;">Pagos registrados:</h6>
              <div *ngFor="let pago of pagosMixtos; let i = index" class="pago-item">
                <div class="pago-metodo">
                  <div class="pago-icono" [style.background]="'var(--' + getMetodoColor(pago.metodo) + '-100)'">
                    <i [class]="getMetodoIcono(pago.metodo)" 
                       [style.color]="'var(--' + getMetodoColor(pago.metodo) + '-600)'"></i>
                  </div>
                  <div>
                    <div class="pago-nombre">{{ pago.metodo }}</div>
                    <small class="text-muted" *ngIf="pago.referencia">{{ pago.referencia }}</small>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3">
                  <div class="pago-monto">S/ {{ pago.monto | number:'1.2-2' }}</div>
                  <button type="button" class="btn-eliminar" (click)="eliminarPago(i)">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0" style="padding: 1.5rem; gap: 1rem;">
            <button type="button" class="btn btn-cancelar flex-fill" (click)="cerrarModal()">
              Cancelar
            </button>
            <button type="button" class="btn btn-confirmar flex-fill" [disabled]="!puedeConfirmar()" (click)="confirmar()">
              Confirmar Factura
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PagoRapidoModalComponent {
  @Input() totalPagar = 0;
  @Output() cancelar = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmarPago = new EventEmitter<PagoResultado>();
  @Output() pagoProcesado = new EventEmitter<PagoResultado>();

  // Variables para pagos mixtos
  pagosMixtos: PagoMixto[] = [];
  nuevoMetodo: PagoResultado['metodo'] = 'EFECTIVO';
  nuevoMonto = 0;
  nuevaReferencia = '';

  // Getters para cálculos dinámicos
  get totalPagado(): number {
    const total = this.pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
    return Math.round(total * 100) / 100; // Redondear a 2 decimales
  }

  get restante(): number {
    const diferencia = this.totalPagar - this.totalPagado;
    return Math.max(0, Math.round(diferencia * 100) / 100); // Redondear a 2 decimales
  }

  get pagoCompleto(): boolean {
    // Considerar completo si la diferencia es menor a 0.01 (1 céntimo)
    return this.restante < 0.01 && this.pagosMixtos.length > 0;
  }

  get sugerencias(): number[] {
    const r = this.redondear(this.restante, 0);
    return [r, r + 5, r + 10];
  }

  redondear(valor: number, decimales: number): number {
    const factor = Math.pow(10, decimales);
    return Math.ceil(valor * factor) / factor;
  }

  puedeAgregarPago(): boolean {
    // Validar monto y referencia obligatoria
    return this.nuevoMonto > 0 &&
      this.nuevoMonto <= this.restante &&
      this.nuevaReferencia.trim() !== '';
  }

  agregarPago(): void {
    if (!this.puedeAgregarPago()) {
      return;
    }

    const nuevoPago: PagoMixto = {
      metodo: this.nuevoMetodo,
      monto: this.nuevoMonto,
      referencia: this.nuevaReferencia || undefined
    };

    this.pagosMixtos.push(nuevoPago);

    // Limpiar campos
    this.nuevoMonto = 0;
    this.nuevaReferencia = '';
  }

  eliminarPago(index: number): void {
    this.pagosMixtos.splice(index, 1);
  }

  llenarRestante(): void {
    this.nuevoMonto = Math.round(this.restante * 100) / 100; // Redondear a 2 decimales
  }

  puedeConfirmar(): boolean {
    return this.pagoCompleto;
  }

  cerrarModal(): void {
    // Limpiar datos al cerrar
    this.pagosMixtos = [];
    this.nuevoMonto = 0;
    this.nuevaReferencia = '';
    this.cancelar.emit();
    this.cerrar.emit();
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) {
      return;
    }

    const res: PagoResultado = {
      metodo: this.pagosMixtos.length === 1 ? this.pagosMixtos[0].metodo : 'EFECTIVO',
      pagosMixtos: this.pagosMixtos
    };

    this.confirmarPago.emit(res);
    this.pagoProcesado.emit(res);

    // Limpiar y cerrar
    this.pagosMixtos = [];
    this.cerrar.emit();
  }

  getMetodoIcono(metodo: string): string {
    const iconos: Record<string, string> = {
      'EFECTIVO': 'fas fa-money-bill-wave',
      'TARJETA': 'fas fa-credit-card',
      'TRANSFERENCIA': 'fas fa-exchange-alt',
      'CREDITO': 'fas fa-file-invoice-dollar',
      'YAPE': 'fas fa-mobile-alt',
      'PLIN': 'fas fa-mobile-alt'
    };
    return iconos[metodo] || 'fas fa-wallet';
  }

  getMetodoColor(metodo: string): string {
    const colores: Record<string, string> = {
      'EFECTIVO': 'success',
      'TARJETA': 'primary',
      'TRANSFERENCIA': 'info',
      'CREDITO': 'warning',
      'YAPE': 'purple',
      'PLIN': 'danger'
    };
    return colores[metodo] || 'secondary';
  }

  // ============================================
  // ATAJOS DE TECLADO
  // ============================================
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    event.preventDefault();
    this.cerrarModal();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
    
    event.preventDefault();
    if (this.puedeConfirmar()) {
      this.confirmar();
    }
  }
}


