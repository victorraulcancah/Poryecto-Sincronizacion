import { Component, EventEmitter, Input, Output, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Popup } from '../../models/popup.model';
import { PopupsService } from '../../services/popups.service';

@Component({
  selector: 'app-popup-cliente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-cliente.component.html',
  styleUrls: ['./popup-cliente.component.scss']
})
export class PopupClienteComponent implements OnInit, OnDestroy {
  @Input() popup!: Popup;
  @Output() cerrar = new EventEmitter<void>();
  @Output() visto = new EventEmitter<void>();

  imageLoaded = signal(false);
  imageError = signal(false);

  imagenUrl = computed(() => this.popupsService.obtenerUrlImagen((this.popup as any)?.imagen_popup_url || (this.popup as any)?.imagen_popup));

  // Computed properties para configuraciones con valores por defecto
  size = computed(() => this.popup?.size || 'medium');
  position = computed(() => this.popup?.position || 'center');
  theme = computed(() => this.popup?.theme || 'light');
  blurBackdrop = computed(() => this.popup?.blur_backdrop ?? true);
  closeOnBackdrop = computed(() => this.popup?.close_on_backdrop ?? false);
  animation = computed(() => this.popup?.animation || 'fade');
  aspectRatio = computed(() => {
    const ratio = this.popup?.imagen_aspect_ratio || '16:9';
    return ratio.replace(':', '-');
  });

  constructor(private popupsService: PopupsService) {}

  onClose(): void {
    this.cerrar.emit();
  }

  onView(): void {
    this.visto.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  onImageError(): void {
    this.imageError.set(true);
    this.imageLoaded.set(true);
  }

  private autoCloseTimer: any;

  ngOnInit(): void {
    const secs = (this.popup as any)?.auto_cerrar_segundos;
    if (secs && secs > 0) {
      this.autoCloseTimer = setTimeout(() => this.onClose(), secs * 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
  }
}


