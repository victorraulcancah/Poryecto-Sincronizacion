import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotasCreditoService } from '../../services/notas-credito.service';
import { FacturacionService } from '../../services/facturacion.service';
import { TIPOS_AFECTACION_IGV, NotaCreditoCreateRequest } from '../../models/facturacion.model';

interface ComprobanteReferencia {
  id: number;
  tipo: string;
  serie: string;
  numero: number;
  numero_completo: string;
  cliente_nombre: string;
  total: number;
  items: any[];
}

@Component({
  selector: 'app-nota-credito-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal fade" [class.show]="mostrar" [style.display]="mostrar ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="ph ph-file-minus me-2"></i>
              Emitir Nota de Crédito
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="cerrar()"></button>
          </div>

          <div class="modal-body">
            <!-- Paso 1: Seleccionar Comprobante -->
            <div *ngIf="paso === 1">
              <h6 class="mb-3">Paso 1: Seleccionar Comprobante a Anular/Corregir</h6>
              
              <div class="mb-3">
                <label class="form-label">Buscar Comprobante</label>
                <div class="input-group">
                  <input type="text" class="form-control" [(ngModel)]="busquedaComprobante" 
                         placeholder="Número de comprobante (ej: F001-123)">
                  <button class="btn btn-primary" (click)="buscarComprobante()" [disabled]="buscando">
                    <i class="ph ph-magnifying-glass me-1"></i>
                    {{ buscando ? 'Buscando...' : 'Buscar' }}
                  </button>
                </div>
              </div>

              <div *ngIf="comprobanteReferencia" class="card">
                <div class="card-body">
                  <h6>Comprobante Seleccionado</h6>
                  <div class="row">
                    <div class="col-md-6">
                      <p><strong>Número:</strong> {{ comprobanteReferencia.numero_completo }}</p>
                      <p><strong>Cliente:</strong> {{ comprobanteReferencia.cliente_nombre }}</p>
                    </div>
                    <div class="col-md-6">
                      <p><strong>Total:</strong> S/ {{ comprobanteReferencia.total | number:'1.2-2' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Paso 2: Tipo y Motivo -->
            <div *ngIf="paso === 2">
              <h6 class="mb-3">Paso 2: Tipo y Motivo de Nota de Crédito</h6>
              
              <div class="mb-3">
                <label class="form-label">Tipo de Nota de Crédito *</label>
                <select class="form-select" [(ngModel)]="notaCredito.tipo_nota_credito" required>
                  <option value="">Seleccione...</option>
                  <option value="01">01 - Anulación de la operación</option>
                  <option value="02">02 - Anulación por error en el RUC</option>
                  <option value="03">03 - Corrección por error en la descripción</option>
                  <option value="04">04 - Descuento global</option>
                  <option value="05">05 - Descuento por ítem</option>
                  <option value="06">06 - Devolución total</option>
                  <option value="07">07 - Devolución por ítem</option>
                  <option value="08">08 - Bonificación</option>
                  <option value="09">09 - Disminución en el valor</option>
                  <option value="13">13 - Otros</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Motivo *</label>
                <input type="text" class="form-control" [(ngModel)]="notaCredito.motivo" 
                       placeholder="Describa el motivo de la nota de crédito" required>
              </div>

              <div class="mb-3">
                <label class="form-label">Descripción Detallada</label>
                <textarea class="form-control" rows="3" [(ngModel)]="notaCredito.descripcion"
                          placeholder="Descripción adicional (opcional)"></textarea>
              </div>
            </div>

            <!-- Paso 3: Items -->
            <div *ngIf="paso === 3">
              <h6 class="mb-3">Paso 3: Seleccionar Items</h6>
              
              <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" [(ngModel)]="anulacionTotal" 
                       (change)="onAnulacionTotalChange()" id="anulacionTotal">
                <label class="form-check-label" for="anulacionTotal">
                  Anulación Total (todos los items)
                </label>
              </div>

              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Seleccionar</th>
                      <th>Descripción</th>
                      <th>Cantidad Original</th>
                      <th>Cantidad NC</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of itemsSeleccionados; let i = index">
                      <td>
                        <input type="checkbox" [(ngModel)]="item.seleccionado" 
                               [disabled]="anulacionTotal">
                      </td>
                      <td>{{ item.descripcion }}</td>
                      <td>{{ item.cantidad_original }}</td>
                      <td>
                        <input type="number" class="form-control form-control-sm" 
                               [(ngModel)]="item.cantidad" [max]="item.cantidad_original"
                               [disabled]="!item.seleccionado || anulacionTotal" min="0.01" step="0.01">
                      </td>
                      <td>S/ {{ item.precio_unitario | number:'1.2-2' }}</td>
                      <td>S/ {{ (item.cantidad * item.precio_unitario) | number:'1.2-2' }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="5" class="text-end"><strong>Total NC:</strong></td>
                      <td><strong>S/ {{ calcularTotalNC() | number:'1.2-2' }}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Paso 4: Confirmación -->
            <div *ngIf="paso === 4">
              <h6 class="mb-3">Paso 4: Confirmación</h6>
              
              <div class="alert alert-info">
                <h6><i class="ph ph-info me-2"></i>Resumen de Nota de Crédito</h6>
                <p><strong>Comprobante:</strong> {{ comprobanteReferencia?.numero_completo }}</p>
                <p><strong>Tipo:</strong> {{ getTipoNotaNombre(notaCredito.tipo_nota_credito) }}</p>
                <p><strong>Motivo:</strong> {{ notaCredito.motivo }}</p>
                <p><strong>Total:</strong> S/ {{ calcularTotalNC() | number:'1.2-2' }}</p>
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones Finales</label>
                <textarea class="form-control" rows="2" [(ngModel)]="notaCredito.observaciones"></textarea>
              </div>
            </div>

            <!-- Mensajes -->
            <div *ngIf="error" class="alert alert-danger">
              <i class="ph ph-warning me-2"></i>{{ error }}
            </div>
            <div *ngIf="success" class="alert alert-success">
              <i class="ph ph-check-circle me-2"></i>{{ success }}
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrar()" [disabled]="procesando">
              Cancelar
            </button>
            <button *ngIf="paso > 1" type="button" class="btn btn-outline-primary" 
                    (click)="pasoAnterior()" [disabled]="procesando">
              <i class="ph ph-arrow-left me-1"></i>
              Anterior
            </button>
            <button *ngIf="paso < 4" type="button" class="btn btn-primary" 
                    (click)="siguientePaso()" [disabled]="!puedeAvanzar()">
              Siguiente
              <i class="ph ph-arrow-right ms-1"></i>
            </button>
            <button *ngIf="paso === 4" type="button" class="btn btn-danger" 
                    (click)="emitirNotaCredito()" [disabled]="procesando">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!procesando" class="ph ph-file-minus me-1"></i>
              {{ procesando ? 'Emitiendo...' : 'Emitir Nota de Crédito' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="mostrar" class="modal-backdrop fade show"></div>
  `,
  styles: [`
    .modal { overflow-y: auto; }
  `]
})
export class NotaCreditoModalComponent implements OnInit {
  @Input() mostrar = false;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() notaCreditoEmitida = new EventEmitter<any>();

  paso = 1;
  busquedaComprobante = '';
  buscando = false;
  procesando = false;
  error = '';
  success = '';

  comprobanteReferencia: ComprobanteReferencia | null = null;
  anulacionTotal = false;

  notaCredito = {
    tipo_nota_credito: '',
    motivo: '',
    descripcion: '',
    observaciones: ''
  };

  itemsSeleccionados: any[] = [];

  constructor(
    private notasCreditoService: NotasCreditoService,
    private facturacionService: FacturacionService
  ) {}

  ngOnInit(): void {}

  buscarComprobante(): void {
    if (!this.busquedaComprobante.trim()) {
      this.error = 'Ingrese un número de comprobante';
      return;
    }

    this.buscando = true;
    this.error = '';

    // Usar el nuevo endpoint de búsqueda
    this.facturacionService.buscarComprobantePorNumero(this.busquedaComprobante).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const comp = response.data;
          
          // Verificar si puede ser anulado
          if (!comp.puede_anular) {
            this.error = response.warning || 'Este comprobante no puede ser anulado';
            this.buscando = false;
            return;
          }

          this.comprobanteReferencia = {
            id: comp.id,
            tipo: comp.tipo_comprobante,
            serie: comp.serie,
            numero: comp.correlativo,
            numero_completo: comp.numero_completo,
            cliente_nombre: comp.cliente?.nombre || 'Sin cliente',
            total: parseFloat(comp.total),
            items: comp.detalles || []
          };
          this.inicializarItems();
          this.success = 'Comprobante encontrado correctamente';
        } else {
          this.error = response.message || 'Comprobante no encontrado';
        }
        this.buscando = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al buscar comprobante';
        this.buscando = false;
      }
    });
  }

  inicializarItems(): void {
    if (!this.comprobanteReferencia) return;

    this.itemsSeleccionados = this.comprobanteReferencia.items.map(item => ({
      ...item,
      cantidad_original: item.cantidad,
      seleccionado: false
    }));
  }

  onAnulacionTotalChange(): void {
    this.itemsSeleccionados.forEach(item => {
      item.seleccionado = this.anulacionTotal;
      if (this.anulacionTotal) {
        item.cantidad = item.cantidad_original;
      }
    });
  }

  calcularTotalNC(): number {
    return this.itemsSeleccionados
      .filter(item => item.seleccionado)
      .reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  }

  getTipoNotaNombre(codigo: string): string {
    const tipos: { [key: string]: string } = {
      '01': 'Anulación de la operación',
      '02': 'Anulación por error en el RUC',
      '03': 'Corrección por error en la descripción',
      '04': 'Descuento global',
      '05': 'Descuento por ítem',
      '06': 'Devolución total',
      '07': 'Devolución por ítem',
      '08': 'Bonificación',
      '09': 'Disminución en el valor'
    };
    return tipos[codigo] || codigo;
  }

  puedeAvanzar(): boolean {
    switch (this.paso) {
      case 1:
        return !!this.comprobanteReferencia;
      case 2:
        return !!this.notaCredito.tipo_nota_credito && !!this.notaCredito.motivo;
      case 3:
        return this.itemsSeleccionados.some(item => item.seleccionado);
      default:
        return true;
    }
  }

  siguientePaso(): void {
    if (this.puedeAvanzar()) {
      this.paso++;
      this.error = '';
    }
  }

  pasoAnterior(): void {
    if (this.paso > 1) {
      this.paso--;
      this.error = '';
    }
  }

  emitirNotaCredito(): void {
    if (!this.comprobanteReferencia) return;

    this.procesando = true;
    this.error = '';
    this.success = '';

    // Preparar datos según lo que el backend realmente espera
    const datos: any = {
      comprobante_referencia_id: this.comprobanteReferencia.id,
      motivo_nota: this.notaCredito.tipo_nota_credito, // Código del catálogo SUNAT (ej: "01", "13")
      motivo_nota_descripcion: this.notaCredito.motivo, // Descripción del motivo
      descripcion: this.notaCredito.descripcion || '', // Descripción adicional (opcional)
      items: this.itemsSeleccionados
        .filter(item => item.seleccionado)
        .map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento || 0,
          tipo_afectacion_igv: item.tipo_afectacion_igv || '10'
        }))
    };

    // Agregar observaciones si existen (campo adicional)
    if (this.notaCredito.observaciones) {
      datos.observaciones = this.notaCredito.observaciones;
    }

    console.log('📤 Datos enviados al backend:', datos);

    this.notasCreditoService.create(datos).subscribe({
      next: (response) => {
        this.success = response.message || 'Nota de Crédito emitida exitosamente';
        this.procesando = false;
        setTimeout(() => {
          this.notaCreditoEmitida.emit(response.data);
          this.cerrar();
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Error del backend:', err);
        
        // Extraer mensaje de error detallado
        let errorMsg = 'Error al emitir Nota de Crédito';
        
        if (err.error?.message) {
          errorMsg = err.error.message;
        } else if (err.error?.error) {
          errorMsg = err.error.error;
        }
        
        // Si hay errores de validación, mostrarlos
        if (err.error?.errors) {
          const errores = Object.values(err.error.errors).flat();
          errorMsg += '\n\nErrores de validación:\n' + errores.join('\n');
        }
        
        this.error = errorMsg;
        this.procesando = false;
      }
    });
  }

  cerrar(): void {
    this.paso = 1;
    this.busquedaComprobante = '';
    this.comprobanteReferencia = null;
    this.anulacionTotal = false;
    this.itemsSeleccionados = [];
    this.error = '';
    this.success = '';
    this.cerrarModal.emit();
  }
}
