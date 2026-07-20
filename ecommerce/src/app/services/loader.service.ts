// src/app/services/loader.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private visibleSubject = new BehaviorSubject<boolean>(false);
  private mensajeSubject = new BehaviorSubject<string>('Cargando...');

  public visible$ = this.visibleSubject.asObservable();
  public mensaje$ = this.mensajeSubject.asObservable();

  show(mensaje: string = 'Cargando...'): void {
    this.mensajeSubject.next(mensaje);
    this.visibleSubject.next(true);
  }

  hide(): void {
    this.visibleSubject.next(false);
  }
}
