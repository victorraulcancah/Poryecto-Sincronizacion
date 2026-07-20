import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout-steps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-steps.component.html',
  styleUrl: './checkout-steps.component.scss'
})
export class CheckoutStepsComponent {
  @Input() pasoActual: 1 | 2 | 3 = 1;

  readonly pasos = [
    { numero: 1, etiqueta: 'Carro' },
    { numero: 2, etiqueta: 'Entrega' },
    { numero: 3, etiqueta: 'Pago' },
  ];
}
