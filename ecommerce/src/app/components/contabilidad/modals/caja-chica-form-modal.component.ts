import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-caja-chica-form-modal',
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
    .form-label {
      font-weight: 500;
      margin-bottom: var(--size-8);
      color: hsl(var(--neutral-700));
    }
    .form-control:focus, .form-select:focus {
      border-color: hsl(var(--main-600));
      box-shadow: 0 0 0 0.25rem hsla(var(--main-600), 0.25);
    }
  `],
  template: `
    <div class="modal fade" [class.show]="visible" 
         [style.display]="visible ? 'block' : 'none'" 
         tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              <i class="ph ph-wallet me-2"></i>
              Nueva Caja Chica
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">
                Nombre <span class="text-danger">*</span>
              </label>
              <div class="position-relative">
                <i class="ph ph-wallet position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                <input 
                  type="text" 
                  class="form-control" 
                  style="padding-left: 40px;"
                  [(ngModel)]="formData.nombre"
                  placeholder="Ej: Caja Chica Oficina"
                  maxlength="100">
              </div>
              <small class="text-muted">El código se generará automáticamente (CCH-001, CCH-002...)</small>
            </div>
            
            <div class="mb-3">
              <label class="form-label">
                Fondo Fijo <span class="text-danger">*</span>
              </label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="ph ph-currency-circle-dollar"></i>
                </span>
                <input 
                  type="number" 
                  class="form-control" 
                  [(ngModel)]="formData.fondo_fijo"
                  placeholder="0.00"
                  step="0.01"
                  min="0">
              </div>
              <small class="text-muted">Monto máximo disponible para gastos menores</small>
            </div>
            
            <div class="mb-3">
              <label class="form-label">
                Responsable <span class="text-danger">*</span>
              </label>
              <div class="position-relative">
                <i class="ph ph-user position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); z-index: 10;"></i>
                <select class="form-select" style="padding-left: 40px;" [(ngModel)]="formData.responsable_id"
                        [disabled]="usuarios.length === 0">
                  <option [value]="''">
                    {{ usuarios.length === 0 ? 'No hay usuarios disponibles' : 'Seleccione un responsable' }}
                  </option>
                  <option *ngFor="let usuario of usuarios" [value]="usuario.id">
                    {{ usuario.name }}
                  </option>
                </select>
              </div>
              <small class="text-muted" *ngIf="usuarios.length > 0">
                Usuario que administrará esta caja chica
              </small>
              <small class="text-warning" *ngIf="usuarios.length === 0">
                <i class="ph ph-warning me-1"></i>
                No tienes permisos para ver usuarios. Contacta al administrador para asignar el responsable.
              </small>
            </div>
            
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                [(ngModel)]="formData.activo"
                id="checkActivoCajaChica">
              <label class="form-check-label" for="checkActivoCajaChica">
                <i class="ph ph-check-circle me-1"></i>
                Caja chica activa
              </label>
              <div class="form-text">La caja estará disponible para registrar gastos</div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button class="btn btn-primary" (click)="guardar()" 
                    [disabled]="procesando || !formData.nombre.trim() || !formData.fondo_fijo || !formData.responsable_id">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              {{ procesando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div *ngIf="visible" class="modal-backdrop fade show"></div>
  `
})
export class CajaChicaFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() usuarios: any[] = [];
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onGuardar = new EventEmitter<any>();
  
  formData: any = {
    nombre: '',
    fondo_fijo: 0,
    responsable_id: '',
    activo: true
  };
  
  ngOnChanges() {
    // Reset form cuando se abre
    if (this.visible) {
      this.formData = {
        nombre: '',
        fondo_fijo: 0,
        responsable_id: '',
        activo: true
      };
    }
  }
  
  cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
  
  guardar() {
    if (!this.formData.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor ingrese el nombre de la caja chica'
      });
      return;
    }
    
    if (!this.formData.fondo_fijo || this.formData.fondo_fijo <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor ingrese un fondo fijo válido'
      });
      return;
    }
    
    if (!this.formData.responsable_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor seleccione un responsable'
      });
      return;
    }
    
    const dataToSend = {
      nombre: this.formData.nombre.trim(),
      fondo_fijo: Number(this.formData.fondo_fijo),
      responsable_id: Number(this.formData.responsable_id),
      activo: this.formData.activo
    };
    
    console.log('📤 Enviando datos de caja chica:', dataToSend);
    this.onGuardar.emit(dataToSend);
  }
}
