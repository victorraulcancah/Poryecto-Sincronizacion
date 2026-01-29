import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SeccionFilterService {
private seccionSeleccionadaSubject = new BehaviorSubject<number | null>(null);
  
  seccionSeleccionada$: Observable<number | null> = this.seccionSeleccionadaSubject.asObservable();

  setSeccionSeleccionada(seccionId: number | null): void {
    this.seccionSeleccionadaSubject.next(seccionId);
  }

  getSeccionSeleccionada(): number | null {
    return this.seccionSeleccionadaSubject.value;
  }

  // Agregar este método después de getSeccionSeleccionada():
  clearSeccionSeleccionada(): void {
    this.seccionSeleccionadaSubject.next(null);
  }
}
