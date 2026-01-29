// src/app/component/cupon-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfertasAdminService, CuponAdmin } from '../../../../services/ofertas-admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cupon-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal -->
    <div class="modal fade" id="modalCrearCupon" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content border-0 rounded-12">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title text-heading fw-semibold">
              {{ cupon?.id ? 'Editar Cupón' : 'Nuevo Cupón' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-24">
            <form (ngSubmit)="guardarCupon()" #cuponForm="ngForm">
              <div class="row">
                
                <!-- Columna Principal -->
                <div class="col-lg-8">
                  
                  <!-- Información básica -->
                  <div class="card border-0 bg-gray-50 mb-20">
                    <div class="card-body p-16">
                      <h6 class="text-heading fw-semibold mb-16 d-flex align-items-center">
                        <i class="ph ph-ticket me-8 text-main-600"></i>
                        Información básica
                      </h6>
                      
                      <div class="row">
                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Código del cupón *</label>
                          <div class="input-group">
                            <input type="text" 
                                   class="form-control text-uppercase px-16 py-12 border"
                                   [(ngModel)]="formData.codigo"
                                   name="codigo"
                                   maxlength="50"
                                   style="text-transform: uppercase;"
                                   placeholder="DESCUENTO20"
                                   required>
                            <button type="button" 
                                    class="btn btn-outline-secondary px-12"
                                    (click)="generarCodigo()"
                                    title="Generar código aleatorio">
                              <i class="ph ph-dice-one"></i>
                            </button>
                          </div>
                          <small class="text-gray-500">Ej: DESCUENTO20, PRIMERACOMPRA, etc.</small>
                        </div>

                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Título *</label>
                          <input type="text" 
                                 class="form-control px-16 py-12 border rounded-8"
                                 [(ngModel)]="formData.titulo"
                                 name="titulo"
                                 placeholder="Ej: Descuento de bienvenida"
                                 required>
                        </div>

                        <div class="col-12 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Descripción</label>
                          <textarea class="form-control px-16 py-12 border rounded-8" 
                                    rows="3"
                                    [(ngModel)]="formData.descripcion"
                                    name="descripcion"
                                    placeholder="Descripción del cupón para uso interno..."></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Configuración de descuento -->
                  <div class="card border-0 bg-gray-50 mb-20">
                    <div class="card-body p-16">
                      <h6 class="text-heading fw-semibold mb-16 d-flex align-items-center">
                        <i class="ph ph-percent me-8 text-success-600"></i>
                        Configuración de descuento
                      </h6>
                      
                      <div class="row">
                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Tipo de descuento *</label>
                          <select class="form-select px-16 py-12 border rounded-8" 
                                  [(ngModel)]="formData.tipo_descuento"
                                  name="tipo_descuento"
                                  required>
                            <option value="porcentaje">Porcentaje (%)</option>
                            <option value="cantidad_fija">Cantidad fija (S/)</option>
                          </select>
                        </div>

                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Valor del descuento *</label>
                          <div class="input-group">
                            <span class="input-group-text bg-gray-50 border-end-0">
                              {{ formData.tipo_descuento === 'porcentaje' ? '%' : 'S/' }}
                            </span>
                            <input type="number" 
                                   class="form-control px-16 py-12 border-start-0"
                                   [(ngModel)]="formData.valor_descuento"
                                   name="valor_descuento"
                                   min="0"
                                   [max]="formData.tipo_descuento === 'porcentaje' ? 100 : null"
                                   step="0.01"
                                   required>
                          </div>
                        </div>

                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Compra mínima</label>
                          <div class="input-group">
                            <span class="input-group-text bg-gray-50 border-end-0">S/</span>
                            <input type="number" 
                                   class="form-control px-16 py-12 border-start-0"
                                   [(ngModel)]="formData.compra_minima"
                                   name="compra_minima"
                                   min="0"
                                   step="0.01"
                                   placeholder="0.00">
                          </div>
                          <small class="text-gray-500">Monto mínimo de compra para usar el cupón</small>
                        </div>

                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Límite de uso</label>
                          <input type="number" 
                                 class="form-control px-16 py-12 border rounded-8"
                                 [(ngModel)]="formData.limite_uso"
                                 name="limite_uso"
                                 min="1"
                                 placeholder="Dejar vacío para uso ilimitado">
                          <small class="text-gray-500">Número máximo de veces que se puede usar</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Fechas de vigencia -->
                  <div class="card border-0 bg-gray-50">
                    <div class="card-body p-16">
                      <h6 class="text-heading fw-semibold mb-16 d-flex align-items-center">
                        <i class="ph ph-calendar me-8 text-warning-600"></i>
                        Vigencia
                      </h6>
                      
                      <div class="row">
                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Fecha de inicio *</label>
                          <input type="datetime-local" 
                                 class="form-control px-16 py-12 border rounded-8"
                                 [(ngModel)]="formData.fecha_inicio"
                                 name="fecha_inicio"
                                 required>
                        </div>

                        <div class="col-md-6 mb-16">
                          <label class="form-label text-heading fw-medium mb-8">Fecha de fin *</label>
                          <input type="datetime-local" 
                                 class="form-control px-16 py-12 border rounded-8"
                                 [(ngModel)]="formData.fecha_fin"
                                 name="fecha_fin"
                                 required>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Columna Lateral -->
                <div class="col-lg-4">
                  
                  <!-- Configuración adicional -->
                  <div class="card border-0 bg-gray-50 mb-20">
                    <div class="card-body p-16">
                      <h6 class="text-heading fw-semibold mb-16 d-flex align-items-center">
                        <i class="ph ph-gear me-8 text-primary-600"></i>
                        Configuración adicional
                      </h6>
                      
                      <div class="d-flex flex-column gap-16">
                        <div class="form-check">
                          <input class="form-check-input" 
                                 type="checkbox" 
                                 [(ngModel)]="formData.solo_primera_compra"
                                 name="solo_primera_compra"
                                 id="solo_primera_compra">
                          <label class="form-check-label text-heading fw-medium" for="solo_primera_compra">
                            Solo para primera compra
                          </label>
                          <small class="text-gray-500 d-block">El cupón solo se puede usar en la primera compra del cliente</small>
                        </div>

                        <div class="form-check">
                          <input class="form-check-input" 
                                 type="checkbox" 
                                 [(ngModel)]="formData.activo"
                                 name="activo"
                                 id="activo">
                          <label class="form-check-label text-heading fw-medium" for="activo">
                            Cupón activo
                          </label>
                          <small class="text-gray-500 d-block">Solo los cupones activos pueden ser utilizados</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Vista previa del cupón -->
                  <div class="card border-0 bg-gray-50" *ngIf="formData.codigo && formData.titulo">
                    <div class="card-body p-16">
                      <h6 class="text-heading fw-semibold mb-16 d-flex align-items-center">
                        <i class="ph ph-eye me-8 text-info-600"></i>
                        Vista previa
                      </h6>
                      
                      <div class="border border-dashed border-main-300 rounded-8 p-16 bg-main-25">
                        <div class="d-flex align-items-center justify-content-between">
                          <div>
                            <h6 class="text-main-600 fw-bold mb-4">{{ formData.codigo }}</h6>
                            <p class="text-gray-600 mb-0 text-sm">{{ formData.titulo }}</p>
                          </div>
                          <div class="text-end">
                            <span class="badge bg-main-600 text-white px-12 py-6 rounded-pill fw-semibold">
                              {{ formData.tipo_descuento === 'porcentaje' ? formData.valor_descuento + '% OFF' : 'S/ ' + formData.valor_descuento + ' OFF' }}
                            </span>
                            <div *ngIf="formData.compra_minima" class="text-xs text-gray-500 mt-4">
                              Compra mínima: S/ {{ formData.compra_minima }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          
          <div class="modal-footer border-0 pt-0">
            <button type="button" 
                    class="btn bg-gray-100 hover-bg-gray-200 text-gray-600 px-16 py-8 rounded-8"
                    data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" 
                    class="btn bg-main-600 hover-bg-main-700 text-white px-16 py-8 rounded-8"
                    [disabled]="isLoading"
                    (click)="guardarCupon()">
              <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-8"></span>
              <i *ngIf="!isLoading" class="ph ph-check me-8"></i>
              {{ isLoading ? 'Guardando...' : (cupon?.id ? 'Actualizar' : 'Crear') }} Cupón
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .form-check {
      padding: 12px;
      border-radius: 8px;
      background: rgba(255,255,255,0.5);
    }
  `]
})
export class CuponModalComponent implements OnInit, OnChanges {
  @Input() cupon: CuponAdmin | null = null;
  @Output() cuponGuardado = new EventEmitter<void>();
  @Output() modalCerrado = new EventEmitter<void>();

  formData: CuponAdmin = this.getEmptyForm();
  isLoading = false;

  constructor(
    private ofertasAdminService: OfertasAdminService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(): void {
    if (this.cupon) {
      this.formData = { ...this.cupon };
      // Convertir fechas para datetime-local
      if (this.formData.fecha_inicio) {
        this.formData.fecha_inicio = this.formatDateForInput(this.formData.fecha_inicio);
      }
      if (this.formData.fecha_fin) {
        this.formData.fecha_fin = this.formatDateForInput(this.formData.fecha_fin);
      }
    } else {
      this.formData = this.getEmptyForm();
    }
  }

  private getEmptyForm(): CuponAdmin {
    return {
      codigo: '',
      titulo: '',
      descripcion: '',
      tipo_descuento: 'porcentaje',
      valor_descuento: 0,
      fecha_inicio: '',
      fecha_fin: '',
      solo_primera_compra: false,
      activo: true
    };
  }

  generarCodigo(): void {
    const prefijos = ['DESC', 'OFERTA', 'PROMO', 'SAVE', 'DEAL'];
    const numeros = Math.floor(Math.random() * 100);
    const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
    this.formData.codigo = `${prefijo}${numeros}`;
  }

  guardarCupon(): void {
    this.isLoading = true;

    const operacion = this.cupon?.id 
      ? this.ofertasAdminService.actualizarCupon(this.cupon.id, this.formData)
      : this.ofertasAdminService.crearCupon(this.formData);

    operacion.subscribe({
      next: () => {
        Swal.fire({
          title: '¡Éxito!',
          text: `Cupón ${this.cupon?.id ? 'actualizado' : 'creado'} correctamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        this.cuponGuardado.emit();
        this.cerrarModal();
        this.isLoading = false;
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el cupón',
          icon: 'error'
        });
        console.error('Error al guardar cupón:', error);
        this.isLoading = false;
      }
    });
  }

  private cerrarModal(): void {
    const modal = document.getElementById('modalCrearCupon');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
    this.modalCerrado.emit();
  }

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }
}