// src\app\component\shipping\shipping.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-shipping',
  imports: [CommonModule],
  templateUrl: './shipping.component.html',
  styleUrl: './shipping.component.scss'
})
export class ShippingComponent {
shippingItems = [
    {
      icon: 'ph-car-profile',
      title: 'Envio Gratis',
      description: 'Si eres cliente y con nuestras promociones',
      duration: '400'
    },
    {
      icon: 'ph-hand-heart',
      title: '100% Entregas Satisfactorias',
      description: 'Delivery seguro con nuestro sistema de envio.',
      duration: '600'
    },
    {
      icon: 'ph-credit-card',
      title: ' Pagos Seguros',
      description: 'Seguridad en los pagos con nuestro sistema de seguridad y filtros',
      duration: '800'
    },
    {
      icon: 'ph-chats',
      title: 'Atención 24x7',
      description: 'Brindamos una respuesta rapida y eficaz ante cualquier consulta o soporte',
      duration: '1000'
    }
  ];
}
