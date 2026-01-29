import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EnviarComprobanteData {
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  mensaje: string;
}

@Component({
  selector: 'app-enviar-comprobante-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enviar-comprobante-modal.component.html',
  styleUrls: ['./enviar-comprobante-modal.component.scss']
})
export class EnviarComprobanteModalComponent {
  @Input() comprobante: any;
  @Input() emailDefault?: string;
  @Input() telefonoDefault?: string;
  
  @Output() enviar = new EventEmitter<EnviarComprobanteData>();
  @Output() cerrar = new EventEmitter<void>();

  // Tipo de envío seleccionado
  tipoEnvio: 'email' | 'whatsapp' = 'email';
  
  // Datos del formulario
  email: string = '';
  telefono: string = '';
  mensaje: string = '';
  
  // Estados
  enviando: boolean = false;

  ngOnInit(): void {
    // Prellenar con datos por defecto
    this.email = this.emailDefault || '';
    this.telefono = this.telefonoDefault || '';
    
    // Mensaje por defecto
    this.mensaje = this.tipoEnvio === 'email' 
      ? 'Estimado cliente, adjunto su comprobante electrónico. Gracias por su compra.'
      : 'Hola, adjunto tu comprobante electrónico. ¡Gracias por tu compra!';
  }

  onTipoEnvioChange(): void {
    // Actualizar mensaje según tipo
    this.mensaje = this.tipoEnvio === 'email' 
      ? 'Estimado cliente, adjunto su comprobante electrónico. Gracias por su compra.'
      : 'Hola, adjunto tu comprobante electrónico. ¡Gracias por tu compra!';
  }

  onEnviar(): void {
    const destinatario = this.tipoEnvio === 'email' ? this.email : this.telefono;
    
    if (!destinatario || destinatario.trim() === '') {
      return;
    }

    this.enviar.emit({
      tipo: this.tipoEnvio,
      destinatario: destinatario.trim(),
      mensaje: this.mensaje.trim()
    });
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  get puedeEnviar(): boolean {
    if (this.tipoEnvio === 'email') {
      return !!(this.email && this.email.trim() !== '' && this.esEmailValido(this.email));
    } else {
      return !!(this.telefono && this.telefono.trim() !== '');
    }
  }

  esEmailValido(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // ============================================
  // ATAJOS DE TECLADO
  // ============================================
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    event.preventDefault();
    this.onCerrar();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
    
    event.preventDefault();
    if (this.puedeEnviar && !this.enviando) {
      this.onEnviar();
    }
  }

  @HostListener('document:keydown.control.s', ['$event'])
  onCtrlS(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.puedeEnviar && !this.enviando) {
      this.onEnviar();
    }
  }
}
