import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="getStatusClass()">
      <i class="ph" [ngClass]="getIconClass()"></i>
      <span class="status-badge__text">{{ label || status }}</span>
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: var(--font-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .status-badge--active {
      background-color: var(--success-50);
      color: var(--success-700);
      border-color: var(--success-200);
    }

    .status-badge--inactive {
      background-color: var(--neutral-50);
      color: var(--neutral-600);
      border-color: var(--neutral-200);
    }

    .status-badge--warning {
      background-color: var(--warning-50);
      color: var(--warning-700);
      border-color: var(--warning-200);
    }

    .status-badge--danger {
      background-color: var(--danger-50);
      color: var(--danger-700);
      border-color: var(--danger-200);
    }

    .ph {
      font-size: var(--font-sm);
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status!: string;
  @Input() label?: string;

  getStatusClass(): string {
    const classes: { [key: string]: string } = {
      'activa': 'status-badge--active',
      'pausada': 'status-badge--warning',
      'programada': 'status-badge--inactive',
      'expirada': 'status-badge--danger',
      'cancelada': 'status-badge--danger'
    };
    return classes[this.status] || 'status-badge--inactive';
  }

  getIconClass(): string {
    const icons: { [key: string]: string } = {
      'activa': 'ph-check-circle',
      'pausada': 'ph-pause-circle',
      'programada': 'ph-clock',
      'expirada': 'ph-x-circle',
      'cancelada': 'ph-x-circle'
    };
    return icons[this.status] || 'ph-circle';
  }
}