import { Pipe, PipeTransform } from '@angular/core';

/**
 * Convierte el código de moneda ('s' = soles, 'd' = dólares)
 * al símbolo a mostrar en la UI ('S/' o 'US$').
 * Si la moneda viene vacía, devuelve 'S/' (default histórico).
 */
@Pipe({
  name: 'moneda',
  standalone: true,
  pure: true,
})
export class MonedaPipe implements PipeTransform {
  transform(value?: string | null): string {
    return value === 'd' ? 'US$' : 'S/';
  }
}
