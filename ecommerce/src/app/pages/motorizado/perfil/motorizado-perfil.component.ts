import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-motorizado-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./motorizado-perfil.component.html",
  styleUrl: "./motorizado-perfil.component.scss"
})
export class MotorizadoPerfilComponent implements OnInit {
  currentUser: User | null = null;
  motorizadoData: any = {};
  estadisticas: any = {};

  historialReciente = [
    {
      numero: 'PED-001',
      fecha: new Date(),
      cliente: 'Juan Pérez',
      direccion: 'Av. Arequipa 1234, Miraflores',
      total: 45.50
    },
    {
      numero: 'PED-002',
      fecha: new Date(Date.now() - 86400000), // Ayer
      cliente: 'María García',
      direccion: 'Jr. de la Unión 500, Lima Centro',
      total: 32.00
    }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.estadisticas = this.currentUser?.estadisticas || {};
    this.cargarDatosMotorizado();
  }

  cargarDatosMotorizado(): void {
    // Aquí se haría la llamada al backend para obtener datos completos del motorizado
    // Por ahora usamos datos de ejemplo
    this.motorizadoData = {
      nombre_completo: this.currentUser?.name,
      telefono: '987654321',
      tipo_documento: 'DNI',
      numero_documento: '12345678',
      vehiculo_marca: 'Honda',
      vehiculo_modelo: 'CB 150',
      vehiculo_ano: 2022,
      vehiculo_placa: 'ABC-123',
      vehiculo_cilindraje: '150cc',
      vehiculo_color_principal: 'Rojo',
      vehiculo_color_secundario: 'Negro',
      licencia_numero: 'L12345678',
      licencia_categoria: 'A2a'
    };
  }
}