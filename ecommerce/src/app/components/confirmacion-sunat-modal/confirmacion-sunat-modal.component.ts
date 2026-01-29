import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ConfirmacionDatos {
  clienteNombre: string;
  clienteDoc: string;
  tipoComprobante: '01' | '03';
  serie: string | null;
  total: number;
  items: number;
}

@Component({
  selector: 'app-confirmacion-sunat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal show d-block" tabindex="-1" 
      style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; 
             width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; 
             justify-content: center !important; background-color: rgba(0,0,0,0.6) !important; z-index: 99999 !important; 
             padding: 20px !important; margin: 0 !important;" 
      (click)="cancelar.emit()">
      <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()" 
        style="margin: 0 auto !important; max-width: 800px; width: 100%;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-paper-plane me-2"></i>
              Confirmar emisión a SUNAT
            </h5>
            <button type="button" class="btn-close" (click)="cancelar.emit()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="border rounded p-3">
                  <h6 class="mb-2">Cliente</h6>
                  <div><strong>{{ datos.clienteNombre || '—' }}</strong></div>
                  <div class="text-muted small">{{ datos.clienteDoc || '' }}</div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="border rounded p-3">
                  <h6 class="mb-2">Comprobante</h6>
                  <div>Tipo: <strong>{{ datos.tipoComprobante === '01' ? 'Factura' : 'Boleta' }}</strong></div>
                  <div>Serie: <strong>{{ datos.serie || '—' }}</strong></div>
                  <div>Total: <strong>S/ {{ datos.total | number:'1.2-2' }}</strong></div>
                  <div>Ítems: <strong>{{ datos.items }}</strong></div>
                </div>
              </div>
            </div>
            <hr>
            <ul class="list-unstyled mb-0">
              <li class="mb-2">
                <i class="fas" [class.fa-check-circle]="validSerie" [class.fa-times-circle]="!validSerie" [class.text-success]="validSerie" [class.text-danger]="!validSerie"></i>
                Serie seleccionada
              </li>
              <li class="mb-2">
                <i class="fas" [class.fa-check-circle]="validCliente" [class.fa-times-circle]="!validCliente" [class.text-success]="validCliente" [class.text-danger]="!validCliente"></i>
                Datos de cliente válidos
              </li>
              <li class="mb-2">
                <i class="fas" [class.fa-check-circle]="validTotal" [class.fa-times-circle]="!validTotal" [class.text-success]="validTotal" [class.text-danger]="!validTotal"></i>
                Total mayor a 0
              </li>
            </ul>
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" id="chkOk" [(ngModel)]="acepto"/>
              <label class="form-check-label" for="chkOk">
                Confirmo que los datos son correctos y deseo emitir a SUNAT.
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancelar.emit()">Cancelar</button>
            <button type="button" class="btn btn-success" [disabled]="!puedeEmitir()" (click)="confirmar.emit()">Emitir</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConfirmacionSunatModalComponent {
  @Input() datos!: ConfirmacionDatos;
  @Output() cancelar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<void>();

  acepto = false;

  get validSerie(): boolean { return !!this.datos?.serie; }
  get validCliente(): boolean { return !!(this.datos?.clienteNombre && this.datos?.clienteNombre.trim().length > 0); }
  get validTotal(): boolean { return (this.datos?.total || 0) > 0; }

  puedeEmitir(): boolean {
    return this.acepto && this.validSerie && this.validCliente && this.validTotal;
  }

  // ============================================
  // ATAJOS DE TECLADO
  // ============================================
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    event.preventDefault();
    this.cancelar.emit();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') return;
    
    event.preventDefault();
    if (this.puedeEmitir()) {
      this.confirmar.emit();
    }
  }
}


