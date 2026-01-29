import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FacturacionService } from '../../services/facturacion.service';
import { Serie } from '../../models/facturacion.model';

@Component({
  selector: 'app-serie-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal fade" [class.show]="mostrar" [style.display]="mostrar ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ serie ? 'Editar Serie' : 'Nueva Serie' }}</h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>
          <div class="modal-body">
            <form [formGroup]="serieForm" (ngSubmit)="guardar()">
              <div class="mb-3">
                <label class="form-label">Tipo de Comprobante</label>
                <select class="form-select" formControlName="tipo_comprobante">
                  <option value="01">Factura</option>
                  <option value="03">Boleta</option>
                  <option value="07">Nota de Crédito</option>
                  <option value="08">Nota de Débito</option>
                </select>
                <div *ngIf="serieForm.get('tipo_comprobante')?.invalid && serieForm.get('tipo_comprobante')?.touched" 
                     class="text-danger small">Seleccione un tipo de comprobante</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Serie</label>
                <input type="text" class="form-control" formControlName="serie" 
                       placeholder="Ej: F001, B001" maxlength="4">
                <div *ngIf="serieForm.get('serie')?.invalid && serieForm.get('serie')?.touched" 
                     class="text-danger small">La serie es requerida (máximo 4 caracteres)</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Correlativo Inicial</label>
                <input type="number" class="form-control" formControlName="correlativo_actual" min="1">
                <div *ngIf="serieForm.get('correlativo_actual')?.invalid && serieForm.get('correlativo_actual')?.touched" 
                     class="text-danger small">El correlativo debe ser mayor a 0</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Descripción (opcional)</label>
                <input type="text" class="form-control" formControlName="descripcion" 
                       placeholder="Descripción de la serie">
              </div>

              <div class="mb-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" formControlName="estado" 
                         [checked]="serieForm.get('estado')?.value === 'activo'">
                  <label class="form-check-label">Serie activa</label>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrar()">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="guardar()" 
                    [disabled]="serieForm.invalid || guardando">
              <span *ngIf="guardando" class="spinner-border spinner-border-sm me-2"></span>
              {{ guardando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="mostrar" class="modal-backdrop fade show"></div>
  `
})
export class SerieFormModalComponent {
  @Input() mostrar = false;
  @Input() serie: Serie | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() serieGuardada = new EventEmitter<Serie>();

  serieForm: FormGroup;
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private facturacionService: FacturacionService
  ) {
    this.serieForm = this.fb.group({
      tipo_comprobante: ['01', Validators.required],
      serie: ['', [Validators.required, Validators.maxLength(4)]],
      correlativo_actual: [1, [Validators.required, Validators.min(1)]],
      descripcion: [''],
      estado: ['activo']
    });
  }

  ngOnChanges(): void {
    if (this.serie) {
      this.serieForm.patchValue({
        tipo_comprobante: this.serie.tipo_comprobante,
        serie: this.serie.serie,
        correlativo_actual: this.serie.correlativo_actual,
        descripcion: this.serie.descripcion || '',
        estado: this.serie.estado === 'activo' ? 'activo' : 'inactivo'
      });
    } else {
      this.serieForm.reset({
        tipo_comprobante: '01',
        serie: '',
        correlativo_actual: 1,
        descripcion: '',
        estado: 'activo'
      });
    }
  }

  guardar(): void {
    if (this.serieForm.invalid) return;

    this.guardando = true;
    const formData = {
      ...this.serieForm.value,
      estado: this.serieForm.get('estado')?.value ? 'activo' : 'inactivo'
    };

    const operacion = this.serie 
      ? this.facturacionService.updateSerie(this.serie.id!, formData)
      : this.facturacionService.createSerie(formData);

    operacion.subscribe({
      next: (response) => {
        this.guardando = false;
        this.serieGuardada.emit(response.data);
        this.cerrar();
      },
      error: (error) => {
        this.guardando = false;
        console.error('Error al guardar serie:', error);
      }
    });
  }

  cerrar(): void {
    this.cerrarModal.emit();
  }
}
