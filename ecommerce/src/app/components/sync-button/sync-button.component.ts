import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SincronizacionService } from '../../services/sincronizacion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sync-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="btn btn-sync"
      [class.syncing]="isSyncing"
      [disabled]="isSyncing"
      (click)="sincronizar()"
      title="Sincronizar marcas, categorías y productos desde 7Power">
      <i class="ph" [class.ph-arrows-clockwise]="!isSyncing" [class.ph-spinner]="isSyncing"></i>
      <span>{{ isSyncing ? 'Sincronizando...' : 'Sincronizar 7Power' }}</span>
    </button>
  `,
  styles: [`
    .btn-sync {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #C62828;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-sync:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(102, 126, 234, 0.35);
    }

    .btn-sync:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-sync:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-sync.syncing i {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .btn-sync i {
      font-size: 18px;
    }
  `]
})
export class SyncButtonComponent {
  isSyncing = false;

  constructor(private sincronizacionService: SincronizacionService) {}

  sincronizar(): void {
    Swal.fire({
      title: '¿Sincronizar desde 7Power?',
      html: `
        <p>Esto sincronizará:</p>
        <ul style="text-align: left; margin: 20px auto; max-width: 300px;">
          <li>✅ Marcas nuevas</li>
          <li>✅ Categorías nuevas</li>
          <li>✅ Productos nuevos</li>
          <li>✅ Stock de productos existentes</li>
          <li>✅ Mapeos automáticos</li>
        </ul>
        <p class="text-muted" style="font-size: 13px;">Las imágenes se deben subir manualmente desde el dashboard.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, sincronizar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-12',
        confirmButton: 'rounded-8',
        cancelButton: 'rounded-8',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarSincronizacion();
      }
    });
  }

  private ejecutarSincronizacion(): void {
    this.isSyncing = true;

    this.sincronizacionService.sincronizarDesde7Power().subscribe({
      next: (response) => {
        this.isSyncing = false;

        if (response.success) {
          // Parsear el output para mostrar estadísticas
          const output = response.output || '';
          const marcasMatch = output.match(/Marcas sincronizadas: (\d+) nuevas/);
          const categoriasMatch = output.match(/Categorías sincronizadas: (\d+) nuevas/);
          const productosMatch = output.match(/Productos sincronizados: (\d+) nuevos/);
          const stockMatch = output.match(/Stock actualizado: (\d+) productos/);

          const marcasNuevas = marcasMatch ? marcasMatch[1] : '0';
          const categoriasNuevas = categoriasMatch ? categoriasMatch[1] : '0';
          const productosNuevos = productosMatch ? productosMatch[1] : '0';
          const stockActualizado = stockMatch ? stockMatch[1] : '0';

          Swal.fire({
            title: '¡Sincronización Exitosa!',
            html: `
              <div style="text-align: left; margin: 20px auto; max-width: 350px;">
                <p><strong>📊 Resultados:</strong></p>
                <ul>
                  <li>🏷️ Marcas nuevas: <strong>${marcasNuevas}</strong></li>
                  <li>📁 Categorías nuevas: <strong>${categoriasNuevas}</strong></li>
                  <li>📦 Productos nuevos: <strong>${productosNuevos}</strong></li>
                  <li>📊 Stock actualizado: <strong>${stockActualizado}</strong> productos</li>
                </ul>
                <p class="text-muted" style="font-size: 13px; margin-top: 15px;">
                  💡 Ahora puedes agregar imágenes a las marcas, categorías y productos desde el dashboard.
                </p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#198754',
            confirmButtonText: 'Entendido',
            customClass: {
              popup: 'rounded-12',
              confirmButton: 'rounded-8',
            },
          }).then(() => {
            // Recargar la página para mostrar los nuevos datos
            window.location.reload();
          });
        } else {
          throw new Error(response.message);
        }
      },
      error: (error) => {
        this.isSyncing = false;
        console.error('Error en sincronización:', error);

        Swal.fire({
          title: 'Error en Sincronización',
          text: error.error?.message || 'No se pudo completar la sincronización. Verifica que 7Power esté corriendo.',
          icon: 'error',
          confirmButtonColor: '#dc3545',
          customClass: {
            popup: 'rounded-12',
            confirmButton: 'rounded-8',
          },
        });
      },
    });
  }
}
