import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfertasService, Cupon } from '../../../services/ofertas.service';
import Swal from 'sweetalert2';

interface CuponUsado extends Cupon {
  fecha_uso?: string;
  descuento_aplicado?: number;
}

@Component({
  selector: 'app-cupones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cupones.component.html',
  styleUrl: './cupones.component.scss'
})
export class CuponesComponent implements OnInit {
  // Pestañas
  activeTab: 'disponibles' | 'usados' = 'disponibles';

  // Cupones
  cuponesDisponibles: Cupon[] = [];
  cuponesUsados: CuponUsado[] = [];

  // Estados de carga
  isLoadingDisponibles = false;
  isLoadingUsados = false;

  constructor(private ofertasService: OfertasService) {}

  ngOnInit(): void {
    this.cargarCuponesDisponibles();
    this.cargarCuponesUsados();
  }

  // Cambiar pestaña
  cambiarTab(tab: 'disponibles' | 'usados'): void {
    this.activeTab = tab;
  }

  // Cargar cupones disponibles
  cargarCuponesDisponibles(): void {
    this.isLoadingDisponibles = true;
    this.ofertasService.obtenerCuponesDisponiblesUsuario().subscribe({
      next: (cupones) => {
        this.cuponesDisponibles = cupones;
        this.isLoadingDisponibles = false;
      },
      error: (error) => {
        console.error('Error al cargar cupones disponibles:', error);
        this.isLoadingDisponibles = false;
      }
    });
  }

  // Cargar cupones usados
  cargarCuponesUsados(): void {
    this.isLoadingUsados = true;
    this.ofertasService.obtenerCuponesUsados().subscribe({
      next: (cupones) => {
        this.cuponesUsados = cupones;
        this.isLoadingUsados = false;
      },
      error: (error) => {
        console.error('Error al cargar cupones usados:', error);
        this.isLoadingUsados = false;
      }
    });
  }

  // Copiar código de cupón
  copiarCodigo(codigo: string): void {
    navigator.clipboard.writeText(codigo).then(() => {
      Swal.fire({
        title: '¡Código copiado!',
        text: `El código ${codigo} ha sido copiado al portapapeles`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    });
  }

  // Formatear fecha
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Verificar si un cupón está por vencer (menos de 7 días)
  estaPorVencer(fechaFin: string | undefined): boolean {
    if (!fechaFin) return false;
    const fin = new Date(fechaFin);
    const ahora = new Date();
    const diff = fin.getTime() - ahora.getTime();
    const diasRestantes = Math.ceil(diff / (1000 * 3600 * 24));
    return diasRestantes <= 7 && diasRestantes > 0;
  }

  // Obtener días restantes
  getDiasRestantes(fechaFin: string | undefined): number {
    if (!fechaFin) return 0;
    const fin = new Date(fechaFin);
    const ahora = new Date();
    const diff = fin.getTime() - ahora.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }
}
