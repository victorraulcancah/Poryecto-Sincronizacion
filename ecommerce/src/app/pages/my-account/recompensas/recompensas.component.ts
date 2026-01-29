import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteRecompensasService } from '../../../services/cliente-recompensas.service';

@Component({
  selector: 'app-mi-recompensas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recompensas.component.html',
  styleUrls: ['./recompensas.component.scss']
})
export class RecompensasMiCuentaComponent implements OnInit {
  loading = false;
  error: string | null = null;
  puntos: any = null;
  activas: any[] = [];
  activeSubTab = 'resumen';

  constructor(private clienteRecompensas: ClienteRecompensasService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = null;

    // Simular carga con datos falsos
    setTimeout(() => {
      // Datos falsos de puntos
      this.puntos = {
        puntos_actuales: {
          total: 2850,
          este_mes: 420
        }
      };

      // Datos falsos de recompensas activas - incluyendo todos los tipos
      this.activas = [
        {
          id: 1,
          nombre: 'Descuento Black Friday',
          descripcion: 'Descuento del 25% en toda la tienda - Válido hasta fin de mes',
          tipo: 'descuento',
          tipo_nombre: 'Descuento',
          fecha_inicio: '2024-11-01',
          fecha_fin: '2024-11-30',
          valor: 25
        },
        {
          id: 2,
          nombre: 'Envío Gratis Premium',
          descripcion: 'Envío gratis sin monto mínimo en todos tus pedidos',
          tipo: 'envio_gratis',
          tipo_nombre: 'Envío Gratis',
          fecha_inicio: '2024-11-01',
          fecha_fin: '2024-12-31',
          valor: 0
        },
        {
          id: 3,
          nombre: 'Puntos Dobles Fin de Semana',
          descripcion: 'Gana el doble de puntos en todas tus compras de viernes a domingo',
          tipo: 'puntos',
          tipo_nombre: 'Puntos',
          fecha_inicio: '2024-11-15',
          fecha_fin: '2024-12-15',
          valor: 2
        },
        {
          id: 4,
          nombre: 'Regalo de Cumpleaños',
          descripcion: 'Regalo especial por tu cumpleaños + 15% de descuento adicional',
          tipo: 'regalo',
          tipo_nombre: 'Regalo',
          fecha_inicio: '2024-10-20',
          fecha_fin: '2024-12-20',
          valor: 15
        },
        {
          id: 5,
          nombre: 'Descuento Primera Compra del Mes',
          descripcion: '10% de descuento en tu primera compra de cada mes',
          tipo: 'descuento',
          tipo_nombre: 'Descuento',
          fecha_inicio: '2024-11-01',
          fecha_fin: '2024-11-30',
          valor: 10
        },
        {
          id: 6,
          nombre: 'Puntos Triple en Electrónicos',
          descripcion: 'Triplica tus puntos en la compra de productos electrónicos',
          tipo: 'puntos',
          tipo_nombre: 'Puntos',
          fecha_inicio: '2024-11-10',
          fecha_fin: '2024-11-25',
          valor: 3
        },
        {
          id: 7,
          nombre: 'Envío Express Gratis',
          descripcion: 'Envío express gratuito en compras mayores a S/. 200',
          tipo: 'envio_gratis',
          tipo_nombre: 'Envío Gratis',
          fecha_inicio: '2024-11-01',
          fecha_fin: '2024-11-30',
          valor: 0
        },
        {
          id: 8,
          nombre: 'Regalo Sorpresa VIP',
          descripcion: 'Regalo exclusivo para clientes VIP en tu próxima compra',
          tipo: 'regalo',
          tipo_nombre: 'Regalo',
          fecha_inicio: '2024-11-01',
          fecha_fin: '2024-12-31',
          valor: 0
        }
      ];

      this.loading = false;
    }, 1000);

    // Código original comentado - descomentar para usar el servicio real
    /*
    this.clienteRecompensas.obtenerPuntos().subscribe({
      next: (resp) => {
        this.puntos = resp?.data || { puntos_actuales: { total: 0, este_mes: 0 } };
      },
      error: (e) => {
        this.puntos = { puntos_actuales: { total: 0, este_mes: 0 } };
        console.error('Error al cargar puntos:', e);
      }
    });

    this.clienteRecompensas.obtenerRecompensasActivas().subscribe({
      next: (resp) => {
        this.activas = resp?.data?.recompensas || [];
        this.loading = false;
      },
      error: (e) => {
        this.activas = [];
        this.loading = false;
        console.error('Error al cargar recompensas:', e);
      }
    });
    */
  }

  cambiarSubTab(subTab: string): void {
    this.activeSubTab = subTab;
  }
}
