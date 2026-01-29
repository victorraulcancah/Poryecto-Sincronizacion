import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PopupsService } from '../../services/popups.service';
import { Popup } from '../../models/popup.model';
import { PopupClienteComponent } from '../popup-cliente/popup-cliente.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-popup-wrapper',
  standalone: true,
  imports: [CommonModule, PopupClienteComponent],
  templateUrl: './popup-wrapper.component.html',
  styleUrls: ['./popup-wrapper.component.scss']
})
export class PopupWrapperComponent implements OnInit, OnDestroy {
  popups = signal<Popup[]>([]);
  visible = signal<boolean>(false);

  private loadTimeout?: any;

  constructor(
    private auth: AuthService,
    private popupsService: PopupsService
  ) {}

  ngOnInit(): void {
    // Retrasar ligeramente para no bloquear la carga inicial
    this.loadTimeout = setTimeout(() => this.cargarPopups(), 300);
  }

  ngOnDestroy(): void {
    if (this.loadTimeout) clearTimeout(this.loadTimeout);
  }

  private cargarPopups(): void {
    const hasToken = !!this.auth.getToken?.();
    const userId = this.auth.getUserId?.();

    // Nueva lógica según especificaciones del backend:
    // - Si tiene userId (logueado o guardado): usar endpoint de cliente con user_cliente_id
    // - Si NO tiene userId: usar endpoint público con segmento 'no_registrados'
    // - El BACKEND es responsable de bloquear admins/motorizados con error 403

    let obs: Observable<any>;

    if (userId) {
      // Usuario con ID (puede ser cliente, admin, o motorizado)
      // El backend decidirá si debe ver popups o devolver 403
      // console.log(`👤 Usuario con ID ${userId} - usando endpoint de cliente con user_cliente_id`);
      obs = this.popupsService.obtenerPopupsActivosConUserId(userId);
    } else {
      // Visitante sin identificar
      // console.log('👋 Visitante no registrado - usando endpoint público con segmento no_registrados');
      obs = this.popupsService.obtenerPopupsPublicosActivos('no_registrados');
    }

    obs.subscribe({
      next: (resp) => this.renderRespuesta(resp),
      error: (err) => {
        console.error('❌ Error cargando popups:', err);

        // Manejo de errores:
        if (err?.status === 403) {
          console.log('🚫 Usuario sin permisos para popups (bloqueado por backend)');
          this.visible.set(false);
          return;
        }

        if (err?.status === 401) {
          console.log('🔓 Token inválido o expirado');
          this.visible.set(false);
          return;
        }

        // Cualquier otro error
        console.log('⚠️ Error genérico al cargar popups');
        this.visible.set(false);
      }
    });
  }

  private renderRespuesta(resp: any): void {
    const data: any = resp?.data as any;
    const lista: Popup[] = (data?.popups_activos || data?.popups || []) as Popup[];
    if (Array.isArray(lista) && lista.length > 0) {
      this.popups.set(lista);
      this.visible.set(true);
    } else {
      // Según la nueva lógica corregida, no hay fallbacks de segmentos
      // Los segmentos están bien definidos: 'no_registrados' para visitantes, otros para clientes
      this.visible.set(false);
    }
  }

  onCerrar(popup: Popup): void {
    this.popupsService.cerrarPopup(popup.id).subscribe({
      next: () => this.removerPopup(popup.id),
      error: (err) => {
        console.error('Error cerrando popup:', err);
        // Si es error 403, significa que el usuario no tiene permisos para cerrar popups
        // pero aún así removemos el popup del frontend para mejor UX
        if (err?.status === 403) {
          console.log('Usuario sin permisos para cerrar popup - removiendo del frontend');
        }
        this.removerPopup(popup.id);
      }
    });
  }

  onVisto(popup: Popup): void {
    this.popupsService.marcarPopupVisto(popup.id).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error marcando popup como visto:', err);
        // No es crítico si falla marcar como visto, solo logueamos el error
        if (err?.status === 403) {
          console.log('Usuario sin permisos para marcar popup como visto');
        }
      }
    });
  }

  private removerPopup(id: number): void {
    const restantes = this.popups().filter(p => p.id !== id);
    this.popups.set(restantes);
    if (restantes.length === 0) this.visible.set(false);
  }
}


