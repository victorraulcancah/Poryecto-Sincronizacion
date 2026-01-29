import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificacionesService } from '../../services/notificaciones.service';
import Swal from 'sweetalert2';

export interface ComprobanteData {
  venta_id: number;
  codigo_venta: string;
  total: number;
  cliente?: {
    nombre: string;
    tipo_documento: string;
    numero_documento: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  };
}

@Component({
  selector: 'app-comprobante-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comprobante-modal.component.html'
})
export class ComprobanteModalComponent implements OnInit {
  @Input() data!: ComprobanteData;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  isSendingEmail = false;

  clienteData = {
    tipo_documento: '1',
    numero_documento: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: ''
  };

  constructor(
    private notificacionesService: NotificacionesService
  ) {}

  ngOnInit(): void {
    if (this.data?.cliente) {
      this.clienteData = {
        tipo_documento: this.data.cliente.tipo_documento || '1',
        numero_documento: this.data.cliente.numero_documento || '',
        nombre: this.data.cliente.nombre || '',
        direccion: this.data.cliente.direccion || '',
        email: this.data.cliente.email || '',
        telefono: this.data.cliente.telefono || ''
      };
    }
  }

  onClose(): void {
    this.close.emit();
  }

  getNumeroComprobante(): string {
    return this.data.codigo_venta;
  }

  imprimirComprobante(): void {
    window.print();
  }

  enviarPorEmail(): void {
    if (!this.clienteData.email) {
      return;
    }

    this.isSendingEmail = true;

    this.notificacionesService.enviarNotificacion({
      tipo: 'email',
      destinatario: this.clienteData.email,
      asunto: `Comprobante de Venta - ${this.data.codigo_venta}`,
      mensaje: `Estimado cliente, adjuntamos su comprobante de venta por un total de S/ ${this.data.total.toFixed(2)}`
    }).subscribe({
      next: () => {
        this.isSendingEmail = false;
        Swal.fire({
          title: '¡Enviado!',
          text: `Email enviado a ${this.clienteData.email}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: () => {
        this.isSendingEmail = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo enviar el email',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }
}
