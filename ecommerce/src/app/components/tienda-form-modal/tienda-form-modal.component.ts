import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tienda, CrearTiendaDto } from '../../models/tienda.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tienda-form-modal',
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
              {{ tienda ? 'Editar Tienda' : 'Nueva Tienda' }}
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">
                Nombre <span class="text-danger">*</span>
              </label>
              <div class="position-relative">
                <i class="ph ph-storefront position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                <input 
                  type="text" 
                  class="form-control" 
                  style="padding-left: 40px;"
                  [(ngModel)]="formData.nombre"
                  placeholder="Ej: Tienda Central"
                  maxlength="100">
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Descripción</label>
              <div class="position-relative">
                <i class="ph ph-text-align-left position-absolute" 
                   style="left: 12px; top: 16px; color: var(--gray-400);"></i>
                <textarea 
                  class="form-control" 
                  style="padding-left: 40px;"
                  [(ngModel)]="formData.descripcion"
                  placeholder="Descripción de la tienda"
                  rows="3"></textarea>
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Logo (URL)</label>
              <div class="position-relative">
                <i class="ph ph-image position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                <input 
                  type="text" 
                  class="form-control" 
                  style="padding-left: 40px;"
                  [(ngModel)]="formData.logo"
                  placeholder="https://ejemplo.com/logo.png"
                  maxlength="255">
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Estado</label>
              <div class="position-relative">
                <i class="ph ph-toggle-right position-absolute" 
                   style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); z-index: 10;"></i>
                <select class="form-select" style="padding-left: 40px;" [(ngModel)]="formData.estado">
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button class="btn btn-primary" (click)="guardar()" 
                    [disabled]="procesando || !formData.nombre.trim()">
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
export class TiendaFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() tienda: Tienda | null = null;
  @Input() procesando = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onGuardar = new EventEmitter<CrearTiendaDto>();
  
  formData: any = {
    nombre: '',
    descripcion: '',
    logo: '',
    estado: 'ACTIVA'
  };
  
  ngOnChanges() {
    if (this.tienda) {
      this.formData = {
        nombre: this.tienda.nombre,
        descripcion: this.tienda.descripcion || '',
        logo: this.tienda.logo || '',
        estado: this.tienda.estado
      };
    } else {
      this.formData = {
        nombre: '',
        descripcion: '',
        logo: '',
        estado: 'ACTIVA'
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
        text: 'Por favor ingrese el nombre de la tienda'
      });
      return;
    }
    
    const dataToSend: CrearTiendaDto = {
      nombre: this.formData.nombre.trim(),
      estado: this.formData.estado
    };
    
    if (this.formData.descripcion.trim()) {
      dataToSend.descripcion = this.formData.descripcion.trim();
    }
    
    if (this.formData.logo.trim()) {
      dataToSend.logo = this.formData.logo.trim();
    }
    
    console.log('📤 Enviando datos de tienda:', dataToSend);
    this.onGuardar.emit(dataToSend);
  }
}
