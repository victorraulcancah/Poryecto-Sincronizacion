import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-motorizado-historial',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./motorizado-historial.component.html",
  styleUrl:"./motorizado-historial.component.scss" 
})
export class MotorizadoHistorialComponent implements OnInit {
  entregas = [
    {
      numero: 'PED-001',
      fecha: new Date(),
      cliente: 'Juan Pérez',
      direccion: 'Av. Arequipa 1234, Miraflores',
      total: 45.50,
      calificacion: 5
    },
    {
      numero: 'PED-002',
      fecha: new Date(Date.now() - 86400000),
      cliente: 'María García',
      direccion: 'Jr. de la Unión 500, Lima Centro',
      total: 32.00,
      calificacion: 4
    }
  ];

  ngOnInit(): void {
    // Cargar historial del backend
  }

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}