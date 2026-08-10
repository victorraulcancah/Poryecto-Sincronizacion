import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartNotificationData {
  isVisible: boolean;
  productName: string;
  productPrice: number;
  productImage: string;
  productMoneda: string;
  quantity: number;
  suggestedProducts: any[];
  /**
   * Id del producto agregado. Con él el modal ubica la línea del carrito y
   * puede cambiarle la cantidad sin salir de la página.
   */
  productId?: number;
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
    productMoneda: 's',
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
    suggestedProducts: any[] = [],
    productMoneda: string = 's',
    productId?: number
  ) {
    this.showNotification({
      productName,
      productPrice,
      productImage,
      productMoneda,
      quantity,
      suggestedProducts,
      productId
    });
  }
}