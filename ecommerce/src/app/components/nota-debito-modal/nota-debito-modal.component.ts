import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotasDebitoService } from '../../services/notas-debito.service';
import { FacturacionService } from '../../services/facturacion.service';
import { TIPOS_AFECTACION_IGV, NotaDebitoCreateRequest } from '../../models/facturacion.model';

interface ComprobanteReferencia {
  id: number;
  tipo: string;
  serie: string;
  numero: number;
  numero_completo: string;
  cliente_nombre: string;
  total: number;
}

interface ItemNotaDebito {
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  tipo_afectacion_igv: string;
  subtotal: number;
  total: number;
}

@Component({
  selector: 'app-nota-debito-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal fade" [class.show]="mostrar" [style.display]="mostrar ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="ph ph-file-plus me-2"></i>
              Emitir Nota de Débito
            </h5>
            <button type="button" class="btn-close" (click)="cerrar()"></button>
          </div>

          <div class="modal-body">
            <!-- Paso 1: Seleccionar Comprobante -->
            <div *ngIf="paso === 1">
              <h6 class="mb-3">Paso 1: Seleccionar Comprobante de Referencia</h6>

              <div class="mb-3">
                <label class="form-label">Buscar Comprobante</label>
                <div class="input-group">
                  <input type="text" class="form-control" [(ngModel)]="busquedaComprobante"
                         placeholder="Número de comprobante (ej: F001-123)"
                         (keyup.enter)="buscarComprobante()">
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
              <h6 class="mb-3">Paso 2: Tipo y Motivo de Nota de Débito</h6>

              <div class="mb-3">
                <label class="form-label">Tipo de Nota de Débito *</label>
                <select class="form-select" [(ngModel)]="tipoNotaDebito" required>
                  <option value="">Seleccione...</option>
                  <option value="01">01 - Intereses por mora</option>
                  <option value="02">02 - Aumento en el valor</option>
                  <option value="03">03 - Penalidades/otros conceptos</option>
                  <option value="10">10 - Ajustes de operaciones de exportación</option>
                  <option value="11">11 - Ajustes afectos al IVAP</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Motivo *</label>
                <input type="text" class="form-control" [(ngModel)]="motivo"
                       placeholder="Describa el motivo de la nota de débito" required>
              </div>

              <div class="mb-3">
                <label class="form-label">Descripción Detallada</label>
                <textarea class="form-control" rows="3" [(ngModel)]="descripcion"
                          placeholder="Descripción adicional (opcional)"></textarea>
              </div>
            </div>

            <!-- Paso 3: Items -->
            <div *ngIf="paso === 3">
              <h6 class="mb-3">Paso 3: Items de la Nota de Débito</h6>

              <div class="mb-3">
                <button type="button" class="btn btn-sm btn-primary" (click)="agregarItem()">
                  <i class="ph ph-plus me-1"></i>
                  Agregar Concepto
                </button>
              </div>

              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Afectación IGV</th>
                      <th>Total</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of items; let i = index">
                      <td>
                        <input type="text" class="form-control form-control-sm"
                               [(ngModel)]="item.concepto" placeholder="Ej: Intereses por mora">
                      </td>
                      <td style="width: 100px;">
                        <input type="number" class="form-control form-control-sm"
                               [(ngModel)]="item.cantidad" (change)="calcularTotalItem(item)"
                               min="0.01" step="0.01">
                      </td>
                      <td style="width: 120px;">
                        <input type="number" class="form-control form-control-sm"
                               [(ngModel)]="item.precio_unitario" (change)="calcularTotalItem(item)"
                               min="0.01" step="0.01">
                      </td>
                      <td style="width: 150px;">
                        <select class="form-select form-select-sm" [(ngModel)]="item.tipo_afectacion_igv">
                          <option value="10">Gravado</option>
                          <option value="20">Exonerado</option>
                          <option value="30">Inafecto</option>
                        </select>
                      </td>
                      <td>S/ {{ item.total | number:'1.2-2' }}</td>
                      <td>
                        <button type="button" class="btn btn-sm btn-danger" (click)="eliminarItem(i)">
                          <i class="ph ph-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4" class="text-end"><strong>Total ND:</strong></td>
                      <td colspan="2"><strong>S/ {{ calcularTotalND() | number:'1.2-2' }}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div *ngIf="items.length === 0" class="alert alert-info">
                No hay items agregados. Haga clic en "Agregar Concepto" para comenzar.
              </div>
            </div>

            <!-- Paso 4: Confirmación -->
            <div *ngIf="paso === 4">
              <h6 class="mb-3">Paso 4: Confirmación</h6>

              <div class="alert alert-warning">
                <h6><i class="ph ph-info me-2"></i>Resumen de Nota de Débito</h6>
                <p><strong>Comprobante:</strong> {{ comprobanteReferencia?.numero_completo }}</p>
                <p><strong>Tipo:</strong> {{ getTipoNotaNombre(tipoNotaDebito) }}</p>
                <p><strong>Motivo:</strong> {{ motivo }}</p>
                <p><strong>Items:</strong> {{ items.length }} concepto(s)</p>
                <p><strong>Total:</strong> S/ {{ calcularTotalND() | number:'1.2-2' }}</p>
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones Finales</label>
                <textarea class="form-control" rows="2" [(ngModel)]="observaciones"></textarea>
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
            <button *ngIf="paso === 4" type="button" class="btn btn-warning"
                    (click)="emitirNotaDebito()" [disabled]="procesando">
              <span *ngIf="procesando" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!procesando" class="ph ph-file-plus me-1"></i>
              {{ procesando ? 'Emitiendo...' : 'Emitir Nota de Débito' }}
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
export class NotaDebitoModalComponent implements OnInit {
  @Input() mostrar = false;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() notaDebitoEmitida = new EventEmitter<any>();

  paso = 1;
  busquedaComprobante = '';
  buscando = false;
  procesando = false;
  error = '';
  success = '';

  comprobanteReferencia: ComprobanteReferencia | null = null;

  tipoNotaDebito = '';
  motivo = '';
  descripcion = '';
  observaciones = '';

  items: ItemNotaDebito[] = [];

  constructor(
    private notasDebitoService: NotasDebitoService,
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
          
          // Verificar si puede ser usado para nota de débito
          if (!comp.puede_anular) {
            this.error = response.warning || 'Este comprobante no puede ser usado';
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
            total: parseFloat(comp.total)
          };
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

  agregarItem(): void {
    this.items.push({
      concepto: '',
      cantidad: 1,
      precio_unitario: 0,
      tipo_afectacion_igv: TIPOS_AFECTACION_IGV.GRAVADO,
      subtotal: 0,
      total: 0
    });
  }

  eliminarItem(index: number): void {
    this.items.splice(index, 1);
  }

  calcularTotalItem(item: ItemNotaDebito): void {
    item.subtotal = item.cantidad * item.precio_unitario;

    // Calcular IGV si es gravado
    if (item.tipo_afectacion_igv === '10') {
      const igv = item.subtotal * 0.18;
      item.total = item.subtotal + igv;
    } else {
      item.total = item.subtotal;
    }
  }

  calcularTotalND(): number {
    return this.items.reduce((sum, item) => {
      this.calcularTotalItem(item);
      return sum + item.total;
    }, 0);
  }

  getTipoNotaNombre(codigo: string): string {
    const tipos: { [key: string]: string } = {
      '01': 'Intereses por mora',
      '02': 'Aumento en el valor',
      '03': 'Penalidades/otros conceptos',
      '10': 'Ajustes de operaciones de exportación',
      '11': 'Ajustes afectos al IVAP'
    };
    return tipos[codigo] || codigo;
  }

  puedeAvanzar(): boolean {
    switch (this.paso) {
      case 1:
        return !!this.comprobanteReferencia;
      case 2:
        return !!this.tipoNotaDebito && !!this.motivo;
      case 3:
        return this.items.length > 0 && this.items.every(item =>
          item.concepto.trim() && item.cantidad > 0 && item.precio_unitario > 0
        );
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

  emitirNotaDebito(): void {
    if (!this.comprobanteReferencia) return;

    this.procesando = true;
    this.error = '';
    this.success = '';

    // Preparar datos según la API
    const datos: any = {
      comprobante_referencia_id: this.comprobanteReferencia.id,
      motivo_nota: this.tipoNotaDebito,
      motivo_nota_descripcion: this.motivo,
      descripcion: this.descripcion || this.observaciones,
      items: this.items.map(item => ({
        concepto: item.concepto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        tipo_afectacion_igv: item.tipo_afectacion_igv
      }))
    };

    // Debug: mostrar payload en consola
    console.log('Payload enviado:', JSON.stringify(datos, null, 2));

    this.notasDebitoService.create(datos).subscribe({
      next: (response) => {
        this.success = response.message || 'Nota de Débito emitida exitosamente';
        this.procesando = false;
        setTimeout(() => {
          this.notaDebitoEmitida.emit(response.data);
          this.cerrar();
        }, 2000);
      },
      error: (err) => {
        console.error('Error al emitir ND:', err);
        this.error = err.error?.error || err.error?.message || 'Error al emitir Nota de Débito';
        this.procesando = false;
      }
    });
  }

  cerrar(): void {
    this.paso = 1;
    this.busquedaComprobante = '';
    this.comprobanteReferencia = null;
    this.tipoNotaDebito = '';
    this.motivo = '';
    this.descripcion = '';
    this.observaciones = '';
    this.items = [];
    this.error = '';
    this.success = '';
    this.cerrarModal.emit();
  }
}
