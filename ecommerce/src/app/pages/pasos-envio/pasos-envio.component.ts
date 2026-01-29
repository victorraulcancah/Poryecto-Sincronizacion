import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PasoEnvio {
  id: number;
  orden: number;
  titulo: string;
  descripcion: string;
  imagen: string | null;
  activo: boolean;
}

@Component({
  selector: 'app-pasos-envio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pasos-envio.component.html',
  styleUrls: ['./pasos-envio.component.scss']
})
export class PasosEnvioComponent implements OnInit {
  pasos: PasoEnvio[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarPasos();
  }

  cargarPasos(): void {
    this.isLoading = true;
    this.error = null;

    this.http.get(`${environment.apiUrl}/pasos-envio`, { responseType: 'text' }).subscribe({
      next: (response: any) => {
        try {
          // Limpiar warnings de PHP antes de parsear JSON
          let cleanResponse = response;
          if (typeof response === 'string') {
            const jsonStart = response.indexOf('{');
            if (jsonStart > 0) {
              cleanResponse = response.substring(jsonStart);
            }
            cleanResponse = JSON.parse(cleanResponse);
          }

          if (cleanResponse.success) {
            this.pasos = cleanResponse.data;
          }
        } catch (e) {
          console.error('Error al parsear respuesta:', e);
          this.error = 'Error al procesar los datos';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar pasos de envío:', err);
        this.error = 'No se pudieron cargar los pasos de envío. Por favor, intenta más tarde.';
        this.isLoading = false;
      }
    });
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/placeholder-step.png';
  }
}
