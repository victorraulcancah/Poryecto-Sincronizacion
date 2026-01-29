// src/app/services/index-two.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IndexTwoService {
  private activarModoArmadoSubject = new Subject<void>();
  
  // Observable para que los componentes se suscriban
  activarModoArmado$ = this.activarModoArmadoSubject.asObservable();
  
  // Método para activar el modo armado
  activarModoArmado(): void {
    this.activarModoArmadoSubject.next();
  }
}