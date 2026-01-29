import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-motorizado-rutas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./motorizado-rutas.component.html",
  styleUrl:"./motorizado-rutas.component.scss"
})
export class MotorizadoRutasComponent implements OnInit {
  ngOnInit(): void {
    // Implementar lógica de rutas
  }
}