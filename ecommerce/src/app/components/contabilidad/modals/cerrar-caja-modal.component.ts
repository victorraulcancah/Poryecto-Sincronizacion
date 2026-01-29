import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CerrarCajaDto } from '../../../models/contabilidad/caja.model';

@Component({
  selector: 'app-cerrar-caja-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .modal-header-custom {
      background: hsl(var(--danger-600));
      color: white;
      padding: 1.5rem;
    }
    .modal-header-custom .btn-close {
      filter: brightness(0) invert(1);
    }
    .saldo-card {
      background: hsl(var(--neutral-50));
      border: 2px solid hsl(var(--neutral-200));
      border-radius: var(--radius-lg);
      padding: var(--size-16);
      margin-bottom: var(--size-16);
    }
    .diferencia-card {
      padding: var(--size-12);
      border-radius: var(--radius-lg);
      margin-top: var(--size-12);
      font-weight: 600;
    }
    .diferencia-card.positiva {
      background: hsl(var(--success-50));
      color: hsl(var(--success-600));
    }
    .diferencia-card.negativa {
      background: hsl(var(--danger-50));
      color: hsl(var(--danger-600));
    }
    .diferencia-card.cero {
      background: hsl(var(--neutral-50));
      color: hsl(var(--neutral-600));
    }
  `],
  template: `
    <div class="modal fade" [class.show]="visible" 
         [style.display]="visible ? 'block' : 'none'">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              Cerrar Caja
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          
          <div class="modal-body">
            <div class="alert alert-warning">
              <strong>Atención:</strong> Esta acción no se puede deshacer. Asegúrate de contar el efectivo correctamente.
            </div>
            
            <div class="saldo-card">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted">Saldo según Sistema:</span>
                <h5 class="mb-0">S/ {{ saldoSistema | number:'1.2-2' }}</h5>
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">
                Monto Final (Arqueo) <span class="text-danger">*</span>
              </label>
              <div class="input-group">
                <span class="input-group-text">S/</span>
                <input 
                  type="number" 
                  class="form-control" 
                  [(ngModel)]="formData.monto_final"
                  placeholder="0.00"
                  step="0.01"
                  min="0">
              </div>
              <small class="text-muted">Ingresa el monto físico contado en caja</small>
            </div>
            
            <!-- Diferencia calculada -->
            <div *ngIf="formData.monto_final > 0" 
                 class="diferencia-card"
                 [class.positiva]="calcularDiferencia() > 0"
                 [class.negativa]="calcularDiferencia() < 0"
                 [class.cero]="calcularDiferencia() === 0">
              <div class="d-flex justify-content-between align-items-center">
                <span>Diferencia:</span>
                <span>
                  {{ calcularDiferencia() > 0 ? '+' : '' }}
                  S/ {{ calcularDiferencia() | number:'1.2-2' }}
                  <span *ngIf="calcularDiferencia() > 0">(Sobrante)</span>
                  <span *ngIf="calcularDiferencia() < 0">(Faltante)</span>
                  <span *ngIf="calcularDiferencia() === 0">(Cuadrado)</span>
                </span>
              </div>
            </div>
            
            <div class="mb-3 mt-3">
              <label class="form-label">Observaciones</label>
              <textarea 
                class="form-control" 
                rows="3"
                [(ngModel)]="formData.observaciones"
                placeholder="Notas sobre el cierre de caja"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button class="btn btn-danger" (click)="confirmarCierre()" 
                    [disabled]="procesando || formData.monto_final <= 0">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              {{ procesando ? 'Cerrando...' : 'Cerrar Caja' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div *ngIf="visible" class="modal-backdrop fade show"></div>
  `
})
export class CerrarCajaModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saldoSistema = 0;
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onCerrar = new EventEmitter<CerrarCajaDto>();
  
  formData: CerrarCajaDto = {
    monto_final: 0,
    observaciones: ''
  };
  
  ngOnChanges() {
    if (this.visible && this.saldoSistema > 0) {
      this.formData.monto_final = this.saldoSistema;
    }
  }
  
  cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }
  
  confirmarCierre() {
    if (this.formData.monto_final <= 0) {
      return;
    }
    this.onCerrar.emit(this.formData);
  }
  
  calcularDiferencia(): number {
    return this.formData.monto_final - this.saldoSistema;
  }
  
  resetForm() {
    this.formData = {
      monto_final: 0,
      observaciones: ''
    };
  }
}
