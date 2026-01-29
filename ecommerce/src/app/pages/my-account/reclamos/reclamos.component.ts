import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

interface Reclamo {
  id: number;
  codigo_reclamo: string;
  fecha_reclamo: string;
  asunto: string;
  descripcion: string;
  estado: string;
  respuesta?: string;
  fecha_respuesta?: string;
}

@Component({
  selector: 'app-reclamos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reclamos.component.html',
  styleUrl: './reclamos.component.scss'
})
export class ReclamosComponent implements OnInit, OnDestroy {
  reclamos: Reclamo[] = [];
  isLoadingReclamos = false;

  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.cargarReclamos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarReclamos(): void {
    // Simulación de carga - aquí conectarías con el servicio real
    this.isLoadingReclamos = true;
    setTimeout(() => {
      this.reclamos = []; // Datos mock o reales
      this.isLoadingReclamos = false;
    }, 1000);
  }

  verDetalleReclamo(reclamo: Reclamo): void {
    console.log('Ver detalle de reclamo:', reclamo);
  }
}