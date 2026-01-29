import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';

interface PagoForm {
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia: string;
  banco?: string;
  numero_operacion?: string;
  observaciones: string;
}

@Component({
  selector: 'app-pago-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModalComponent],
  template: `
    <app-base-modal
      [isOpen]="isOpen"
      [title]="'Registrar Pago'"
      icon="ph ph-money"
      size="md"
      headerClass="bg-success text-white"
      [loading]="loading"
      [confirmDisabled]="!isFormValid()"
      confirmText="Registrar Pago"
      confirmIcon="ph ph-check-circle"
      (onClose)="close()"
      (onConfirm)="submit()">
      
      <!-- Información de la cuenta -->
      <div class="alert alert-info mb-3" *ngIf="cuentaInfo">
        <h6 class="mb-2">{{ tipoCuenta === 'CXC' ? 'Cuenta por Cobrar' : 'Cuenta por Pagar' }}</h6>
        <p class="mb-1"><strong>Documento:</strong> {{ cuentaInfo.numero_documento }}</p>
        <p class="mb-1"><strong>Monto Total:</strong> {{ cuentaInfo.moneda }} {{ cuentaInfo.monto_total | number:'1.2-2' }}</p>
        <p class="mb-1"><strong>Saldo Pendiente:</strong> {{ cuentaInfo.moneda }} {{ cuentaInfo.saldo_pendiente | number:'1.2-2' }}</p>
        <p class="mb-0"><strong>Vencimiento:</strong> {{ cuentaInfo.fecha_vencimiento | date:'dd/MM/yyyy' }}</p>
      </div>

      <div class="row g-3">
        <!-- Monto -->
        <div class="col-12">
          <label class="form-label">Monto del Pago *</label>
          <div class="input-group">
            <span class="input-group-text">{{ cuentaInfo?.moneda || 'PEN' }}</span>
            <input type="number" class="form-control" [(ngModel)]="form.monto" 
                   [max]="cuentaInfo?.saldo_pendiente || 0"
                   step="0.01" min="0.01" placeholder="0.00" required>
          </div>
          <small class="text-muted">Máximo: {{ cuentaInfo?.saldo_pendiente | number:'1.2-2' }}</small>
        </div>

        <!-- Fecha de Pago -->
        <div class="col-12">
          <label class="form-label">Fecha de Pago *</label>
          <input type="date" class="form-control" [(ngModel)]="form.fecha_pago" required>
        </div>

        <!-- Método de Pago -->
        <div class="col-12">
          <label class="form-label">Método de Pago *</label>
          <select class="form-select" [(ngModel)]="form.metodo_pago" (change)="onMetodoPagoChange()">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="deposito">Depósito Bancario</option>
            <option value="cheque">Cheque</option>
            <option value="tarjeta">Tarjeta de Crédito/Débito</option>
          </select>
        </div>

        <!-- Campos adicionales para transferencia/depósito -->
        <ng-container *ngIf="form.metodo_pago === 'transferencia' || form.metodo_pago === 'deposito'">
          <div class="col-md-6">
            <label class="form-label">Banco</label>
            <input type="text" class="form-control" [(ngModel)]="form.banco" placeholder="Nombre del banco">
          </div>
          <div class="col-md-6">
            <label class="form-label">Nº Operación</label>
            <input type="text" class="form-control" [(ngModel)]="form.numero_operacion" placeholder="Número de operación">
          </div>
        </ng-container>

        <!-- Referencia -->
        <div class="col-12">
          <label class="form-label">Referencia</label>
          <input type="text" class="form-control" [(ngModel)]="form.referencia" 
                 placeholder="Número de recibo, comprobante, etc.">
        </div>

        <!-- Observaciones -->
        <div class="col-12">
          <label class="form-label">Observaciones</label>
          <textarea class="form-control" rows="2" [(ngModel)]="form.observaciones"
                    placeholder="Observaciones adicionales (opcional)"></textarea>
        </div>
      </div>

      <!-- Mensajes -->
      <div *ngIf="error" class="alert alert-danger mt-3">
        <i class="ph ph-warning me-2"></i>{{ error }}
      </div>
      <div *ngIf="success" class="alert alert-success mt-3">
        <i class="ph ph-check-circle me-2"></i>{{ success }}
      </div>
    </app-base-modal>
  `
})
export class PagoModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() cuentaId!: number;
  @Input() tipoCuenta: 'CXC' | 'CXP' = 'CXC';
  @Input() cuentaInfo: any;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<any>();

  loading = false;
  error = '';
  success = '';

  form: PagoForm = {
    monto: 0,
    fecha_pago: new Date().toISOString().split('T')[0],
    metodo_pago: 'efectivo',
    referencia: '',
    observaciones: ''
  };

  constructor() {}

  ngOnInit(): void {
    if (this.cuentaInfo) {
      this.form.monto = this.cuentaInfo.saldo_pendiente;
    }
  }

  onMetodoPagoChange(): void {
    if (this.form.metodo_pago !== 'transferencia' && this.form.metodo_pago !== 'deposito') {
      this.form.banco = undefined;
      this.form.numero_operacion = undefined;
    }
  }

  isFormValid(): boolean {
    return this.form.monto > 0 &&
           this.form.monto <= (this.cuentaInfo?.saldo_pendiente || 0) &&
           this.form.fecha_pago !== '' &&
           this.form.metodo_pago !== '';
  }

  submit(): void {
    if (!this.isFormValid()) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const pagoData = {
      monto: this.form.monto,
      fecha_pago: this.form.fecha_pago,
      metodo_pago: this.form.metodo_pago,
      referencia: this.form.referencia,
      banco: this.form.banco,
      numero_operacion: this.form.numero_operacion,
      observaciones: this.form.observaciones
    };

    // Emitir el evento con los datos del pago
    // El componente padre se encargará de llamar al servicio correcto
    this.onSuccess.emit({ ...pagoData, cuenta_id: this.cuentaId });
    this.close();
  }

  close(): void {
    this.error = '';
    this.success = '';
    this.form = {
      monto: 0,
      fecha_pago: new Date().toISOString().split('T')[0],
      metodo_pago: 'efectivo',
      referencia: '',
      observaciones: ''
    };
    this.onClose.emit();
  }
}
