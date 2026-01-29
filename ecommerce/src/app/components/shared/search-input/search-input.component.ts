import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-input-container">
      <label *ngIf="label" class="search-input__label">{{ label }}</label>
      <div class="search-input__wrapper">
        <i class="ph ph-magnifying-glass"></i>
        <input
          type="text"
          class="form-control"
          [placeholder]="placeholder"
          [(ngModel)]="searchValue"
          (ngModelChange)="onValueChange($event)"
        />
        <button
          *ngIf="searchValue"
          class="search-input__clear"
          (click)="clearSearch()"
          title="Limpiar búsqueda">
          <i class="ph ph-x"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .search-input-container {
      width: 100%;
    }

    .search-input__label {
      display: block;
      font-size: var(--font-sm);
      font-weight: 500;
      color: var(--neutral-600);
      margin-bottom: 8px;
    }

    .search-input__wrapper {
      position: relative;
      width: 100%;

      .ph-magnifying-glass {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: var(--font-lg);
        color: var(--neutral-400);
        pointer-events: none;
      }

      .form-control {
        width: 100%;
        height: 42px;
        padding: 8px 40px;
        border: 1px solid var(--neutral-200);
        border-radius: var(--radius-lg);
        font-size: var(--font-sm);
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--neutral-300);
        }

        &:focus {
          border-color: var(--main-500);
          box-shadow: 0 0 0 2px var(--main-100);
        }

        &::placeholder {
          color: var(--neutral-400);
        }
      }
    }

    .search-input__clear {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--neutral-400);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: var(--neutral-600);
      }

      i {
        font-size: var(--font-lg);
      }
    }
  `]
})
export class SearchInputComponent {
  @Input() label?: string;
  @Input() placeholder: string = 'Buscar...';
  @Input() searchValue: string = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }

  clearSearch(): void {
    this.searchValue = '';
    this.valueChange.emit('');
    this.clear.emit();
  }
}