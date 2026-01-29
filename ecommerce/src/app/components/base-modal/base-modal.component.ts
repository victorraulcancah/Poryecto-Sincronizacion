import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal fade" [class.show]="isOpen"
         [style.display]="isOpen ? 'block' : 'none'"
         [attr.aria-hidden]="!isOpen"
         tabindex="-1"
         (click)="onBackdropClick($event)">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
           [ngClass]="getModalClass()"
           (click)="$event.stopPropagation()">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header" [ngClass]="headerClass">
            <h5 class="modal-title">
              <i *ngIf="icon" [class]="icon + ' me-2'"></i>
              {{ title }}
            </h5>
            <button type="button" class="btn-close"
                    [class.btn-close-white]="headerClass.includes('text-white')"
                    (click)="close()"
                    [disabled]="loading"></button>
          </div>

          <!-- Body -->
          <div class="modal-body" [ngClass]="bodyClass">
            <ng-content></ng-content>
          </div>

          <!-- Footer -->
          <div class="modal-footer" *ngIf="showFooter" [ngClass]="footerClass">
            <ng-content select="[footer]"></ng-content>

            <!-- Botones por defecto si no se proporciona contenido personalizado -->
            <ng-container *ngIf="!hasFooterContent">
              <button type="button" class="btn btn-secondary"
                      (click)="close()"
                      [disabled]="loading">
                {{ cancelText }}
              </button>
              <button *ngIf="showConfirmButton"
                      type="button"
                      [class]="confirmButtonClass"
                      (click)="confirm()"
                      [disabled]="loading || confirmDisabled">
                <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                <i *ngIf="!loading && confirmIcon" [class]="confirmIcon + ' me-1'"></i>
                {{ loading ? loadingText : confirmText }}
              </button>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="isOpen" class="modal-backdrop fade show"></div>
  `,
  styles: [`
    .modal {
      overflow-y: auto;
    }

    .modal-dialog {
      margin: 1.75rem auto;
    }

    .modal-dialog-centered {
      display: flex;
      align-items: center;
      min-height: calc(100% - 3.5rem);
    }

    .modal-dialog-scrollable {
      height: calc(100% - 3.5rem);
    }

    .modal-dialog-scrollable .modal-content {
      max-height: 100%;
      overflow: hidden;
    }

    .modal-dialog-scrollable .modal-body {
      overflow-y: auto;
    }

    .modal-xl {
      max-width: 1140px;
    }

    .modal-lg {
      max-width: 800px;
    }

    .modal-md {
      max-width: 500px;
    }

    .modal-sm {
      max-width: 300px;
    }

    .modal-full {
      max-width: 95%;
      margin: 1.75rem auto;
    }

    @media (max-width: 576px) {
      .modal-dialog {
        margin: 0.5rem;
      }
    }
  `]
})
export class BaseModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() icon = '';
  @Input() size: ModalSize = 'md';
  @Input() headerClass = '';
  @Input() bodyClass = '';
  @Input() footerClass = '';
  @Input() showFooter = true;
  @Input() showConfirmButton = true;
  @Input() confirmText = 'Guardar';
  @Input() confirmIcon = 'ph ph-check';
  @Input() confirmButtonClass = 'btn btn-primary';
  @Input() confirmDisabled = false;
  @Input() cancelText = 'Cancelar';
  @Input() loading = false;
  @Input() loadingText = 'Procesando...';
  @Input() hasFooterContent = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  getModalClass(): string {
    const sizeMap = {
      'sm': 'modal-sm',
      'md': '',
      'lg': 'modal-lg',
      'xl': 'modal-xl',
      'full': 'modal-full'
    };
    return sizeMap[this.size] || '';
  }

  onBackdropClick(event: MouseEvent): void {
    // Cerrar solo si se hace click en el backdrop (no en el contenido del modal)
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    if (!this.loading) {
      this.onClose.emit();
    }
  }

  confirm(): void {
    this.onConfirm.emit();
  }
}
