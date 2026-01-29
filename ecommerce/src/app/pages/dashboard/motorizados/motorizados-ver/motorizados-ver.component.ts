import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MotorizadosService, Motorizado } from '../../../../services/motorizados.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-motorizados-ver',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './motorizados-ver.component.html',
  styles: [`
    .motorizados-ver-container {
      padding: 20px;
    }
  `]
})
export class MotorizadosVerComponent implements OnInit {
  motorizado: Motorizado | null = null;
  isLoading = true;
  apiUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private motorizadoService: MotorizadosService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadMotorizado();
  }

  loadMotorizado(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastr.error('ID de motorizado no proporcionado');
      this.router.navigate(['/dashboard/motorizados']);
      return;
    }

    this.motorizadoService.getMotorizado(+id).subscribe({
      next: (data) => {
        this.motorizado = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar el motorizado:', error);
        this.toastr.error('Error al cargar los datos del motorizado');
        this.router.navigate(['/dashboard/motorizados']);
      }
    });
  }

  getEstadoBadgeClass(estado: boolean | undefined): string {
    return estado ? 'badge-success' : 'badge-danger';
  }

  getEstadoText(estado: boolean | undefined): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  getDocumentoCompleto(): string {
    if (!this.motorizado) return '';
    const tipo = this.motorizado.tipo_documento?.nombre || 'DNI';
    return `${tipo}: ${this.motorizado.numero_documento}`;
  }

  getFotoPerfil(): string {
    if (!this.motorizado?.foto_perfil) return 'assets/images/avatar-default.png';
    return `${this.apiUrl}/storage/${this.motorizado.foto_perfil}`;
  }

  onBack(): void {
    this.router.navigate(['/dashboard/motorizados']);
  }

  onEdit(): void {
    if (this.motorizado?.id) {
      this.router.navigate(['/dashboard/motorizados/editar', this.motorizado.id]);
    }
  }
}
