import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartNotificationData {
  isVisible: boolean;
  productName: string;
  productPrice: number;
  productImage: string;
  quantity: number;
  suggestedProducts: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CartNotificationService {
  private notificationSubject = new BehaviorSubject<CartNotificationData>({
    isVisible: false,
    productName: '',
    productPrice: 0,
    productImage: '',
    quantity: 1,
    suggestedProducts: []
  });

  public notification$ = this.notificationSubject.asObservable();

  constructor() { }

  showNotification(data: Omit<CartNotificationData, 'isVisible'>) {
    this.notificationSubject.next({
      ...data,
      suggestedProducts: data.suggestedProducts || [],
      isVisible: true
    });
  }

  hideNotification() {
    const currentData = this.notificationSubject.value;
    this.notificationSubject.next({
      ...currentData,
      isVisible: false
    });
  }

  // Método conveniente para mostrar notificación con producto
  showProductAddedNotification(
    productName: string,
    productPrice: number,
    productImage: string,
    quantity: number = 1,
    suggestedProducts: any[] = []
  ) {
    this.showNotification({
      productName,
      productPrice,
      productImage,
      quantity,
      suggestedProducts
    });
  }
}