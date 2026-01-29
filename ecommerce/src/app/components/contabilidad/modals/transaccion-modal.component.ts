import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrarTransaccionDto } from '../../../models/contabilidad/caja.model';

@Component({
  selector: 'app-transaccion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .modal-header-custom {
      background: hsl(var(--main-600));
      color: white;
      padding: 1.5rem;
    }
    .modal-header-custom .btn-close {
      filter: brightness(0) invert(1);
    }
    .tipo-toggle {
      display: flex;
      gap: var(--size-8);
      margin-bottom: var(--size-16);
    }
    .tipo-btn {
      flex: 1;
      padding: var(--size-12);
      border: 2px solid hsl(var(--neutral-300));
      border-radius: var(--radius-lg);
      background: white;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--size-8);
      font-weight: 500;
    }
    .tipo-btn:hover:not(.active) {
      border-color: hsl(var(--main-600));
    }
    .tipo-btn.active.ingreso {
      background: hsl(var(--success-50));
      border-color: hsl(var(--success-600));
      color: hsl(var(--success-600));
    }
    .tipo-btn.active.egreso {
      background: hsl(var(--danger-50));
      border-color: hsl(var(--danger-600));
      color: hsl(var(--danger-600));
    }
  `],
  template: `
    <div class="modal fade" [class.show]="visible" 
         [style.display]="visible ? 'block' : 'none'">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              Registrar Transacción
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          
          <div class="modal-body">
            <!-- Toggle Tipo -->
            <div class="tipo-toggle">
              <button 
                type="button"
                class="tipo-btn ingreso"
                [class.active]="formData.tipo === 'INGRESO'"
                (click)="formData.tipo = 'INGRESO'">
                Ingreso
              </button>
              <button 
                type="button"
                class="tipo-btn egreso"
                [class.active]="formData.tipo === 'EGRESO'"
                (click)="formData.tipo = 'EGRESO'">
                Egreso
              </button>
            </div>
            
            <!-- Categoría -->
            <div class="mb-3">
              <label class="form-label">
                Categoría <span class="text-danger">*</span>
              </label>
              <select class="form-select" [(ngModel)]="formData.categoria" (ngModelChange)="onCategoriaChange()">
                <option value="">Seleccione...</option>
                <option value="VENTA">Venta</option>
                <option value="COBRO">Cobro</option>
                <option value="GASTO">Gasto</option>
                <option value="RETIRO">Retiro</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            
            <!-- Monto -->
            <div class="mb-3">
              <label class="form-label">
                Monto <span class="text-danger">*</span>
              </label>
              <div class="input-group">
                <span class="input-group-text">S/</span>
                <input 
                  type="number" 
                  class="form-control" 
                  [(ngModel)]="formData.monto"
                  placeholder="0.00"
                  step="0.01"
                  min="0">
              </div>
            </div>
            
            <!-- Método de Pago -->
            <div class="mb-3">
              <label class="form-label">
                Método de Pago <span class="text-danger">*</span>
              </label>
              <select class="form-select" [(ngModel)]="formData.metodo_pago">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
              </select>
            </div>
            
            <!-- Referencia -->
            <div class="mb-3">
              <label class="form-label">Referencia</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="formData.referencia"
                placeholder="Ej: Operación #123, Venta #456">
              <small class="text-muted">Opcional: Número de operación o referencia</small>
            </div>
            
            <!-- Descripción -->
            <div class="mb-3">
              <label class="form-label">Descripción</label>
              <textarea 
                class="form-control" 
                rows="3"
                [(ngModel)]="formData.descripcion"
                placeholder="Detalles de la transacción"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button class="btn btn-primary" (click)="registrar()" 
                    [disabled]="procesando || !esValido()">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              {{ procesando ? 'Registrando...' : 'Registrar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div *ngIf="visible" class="modal-backdrop fade show"></div>
  `
})
export class TransaccionModalComponent {
  @Input() visible = false;
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onRegistrar = new EventEmitter<RegistrarTransaccionDto>();
  
  formData: RegistrarTransaccionDto = {
    tipo: 'INGRESO',
    categoria: 'VENTA',
    monto: 0,
    metodo_pago: 'EFECTIVO',
    referencia: '',
    descripcion: ''
  };
  
  cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }
  
  registrar() {
    if (!this.esValido()) {
      return;
    }
    
    // 🔍 DEBUG: Ver qué se está enviando
    console.log('📤 Registrando transacción:', this.formData);
    
    this.onRegistrar.emit(this.formData);
  }
  
  esValido(): boolean {
    return this.formData.monto > 0 && !!this.formData.categoria;
  }
  
  onCategoriaChange() {
    // Cambiar automáticamente el tipo según la categoría
    if (this.formData.categoria === 'GASTO' || this.formData.categoria === 'RETIRO') {
      this.formData.tipo = 'EGRESO';
    } else if (this.formData.categoria === 'VENTA' || this.formData.categoria === 'COBRO') {
      this.formData.tipo = 'INGRESO';
    }
    // OTRO puede ser cualquiera, no cambiamos el tipo
  }
  
  resetForm() {
    this.formData = {
      tipo: 'INGRESO',
      categoria: 'VENTA',
      monto: 0,
      metodo_pago: 'EFECTIVO',
      referencia: '',
      descripcion: ''
    };
  }
}
