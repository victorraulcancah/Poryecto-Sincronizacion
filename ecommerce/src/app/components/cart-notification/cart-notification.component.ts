import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-notification',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart-notification.component.html',
  styleUrl: './cart-notification.component.scss'
})
export class CartNotificationComponent implements OnInit, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() productName: string = '';
  @Input() productPrice: number = 0;
  @Input() productImage: string = '';
  @Input() quantity: number = 1;
  @Input() showSuggestions: boolean = true;
  @Input() suggestedProducts: any[] = [];
  @Input() autoCloseDelay: number = 8000; // 8 segundos

  @Output() onClose = new EventEmitter<void>();
  @Output() onViewCart = new EventEmitter<void>();
  @Output() onSuggestedProductSelect = new EventEmitter<any>();

  private autoCloseTimer?: number;

  ngOnInit() {
    if (this.isVisible && this.autoCloseDelay > 0) {
      this.startAutoCloseTimer();
    }
  }

  ngOnDestroy() {
    this.clearAutoCloseTimer();
  }

  private startAutoCloseTimer() {
    this.clearAutoCloseTimer();
    this.autoCloseTimer = window.setTimeout(() => {
      this.closeNotification();
    }, this.autoCloseDelay);
  }

  private clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      window.clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }

  onOverlayClick() {
    this.closeNotification();
  }

  closeNotification() {
    this.clearAutoCloseTimer();
    this.onClose.emit();
  }

  goToCart() {
    this.clearAutoCloseTimer();
    this.onViewCart.emit();
  }

  onSuggestedProductClick(product: any) {
    this.onSuggestedProductSelect.emit(product);
  }

  onImageError(event: any) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/thumbs/product-default.png';
  }
}