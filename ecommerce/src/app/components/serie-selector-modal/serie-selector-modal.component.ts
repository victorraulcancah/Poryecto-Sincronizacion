import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SerieItem {
  serie: string;
  tipo_comprobante: string; // aceptar también '07', '08' u otros
  correlativo_actual: number;
}

@Component({
  selector: 'app-serie-selector-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal show d-block" tabindex="-1" 
      style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; 
             width: 100vw !important; height: 100vh !important; display: flex !important; align-items: center !important; 
             justify-content: center !important; background-color: rgba(0,0,0,0.6) !important; z-index: 99999 !important; 
             padding: 20px !important; margin: 0 !important;" 
      (click)="cerrar.emit()">
      <div class="modal-dialog" (click)="$event.stopPropagation()" 
        style="margin: 0 auto !important; max-width: 500px; width: 100%;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-hashtag me-2"></i>
              Seleccionar Serie
            </h5>
            <button type="button" class="btn-close" (click)="cerrar.emit()"></button>
          </div>
          <div class="modal-body">
            <div class="list-group">
              <button
                type="button"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                *ngFor="let s of series"
                (click)="seleccionar(s)"
              >
                <div>
                  <div><strong>{{ s.serie }}</strong> <span class="badge bg-secondary ms-2">{{ s.tipo_comprobante === '01' ? 'Factura' : 'Boleta' }}</span></div>
                  <small class="text-muted">Próximo: {{ s.correlativo_actual + 1 }}</small>
                </div>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
            <div *ngIf="!series || series.length===0" class="text-center text-muted py-3">
              No hay series disponibles
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrar.emit()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SerieSelectorModalComponent {
  @Input() series: any[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() seleccionarSerie = new EventEmitter<any>();

  seleccionar(s: any): void {
    this.seleccionarSerie.emit(s);
  }

  // ============================================
  // ATAJOS DE TECLADO
  // ============================================
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    event.preventDefault();
    this.cerrar.emit();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.series && this.series.length > 0) {
      this.seleccionar(this.series[0]);
    }
  }
}


