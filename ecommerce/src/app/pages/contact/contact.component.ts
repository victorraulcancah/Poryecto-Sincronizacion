// src\app\pages\contact\contact.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { EmpresaInfoService } from '../../services/empresa-info.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, BreadcrumbComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isBrowser: boolean = false;
  empresaInfo: any = null;
  isLoadingEmpresaInfo: boolean = false;

  // Formulario de contacto
  contactForm = {
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: ''
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private empresaInfoService: EmpresaInfoService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.cargarInformacionEmpresa();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarInformacionEmpresa(): void {
    if (!this.isBrowser) return;
    
    this.isLoadingEmpresaInfo = true;
    this.empresaInfoService.obtenerEmpresaInfoPublica()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.empresaInfo = info;
          this.isLoadingEmpresaInfo = false;
        },
        error: (error) => {
          console.error('Error al cargar información de la empresa:', error);
          this.isLoadingEmpresaInfo = false;
          // Mantener valores por defecto en caso de error
          this.empresaInfo = null;
        }
      });
  }

  onSubmit(): void {
    // Validar formulario
    if (!this.contactForm.nombre || !this.contactForm.email || 
        !this.contactForm.telefono || !this.contactForm.asunto || 
        !this.contactForm.mensaje) {
      alert('Por favor, complete todos los campos obligatorios.');
      return;
    }

    // Aquí puedes implementar el envío del formulario
    console.log('Formulario enviado:', this.contactForm);
    
    // Simular envío exitoso
    alert('¡Mensaje enviado exitosamente! Nos pondremos en contacto contigo pronto.');
    
    // Limpiar formulario
    this.resetForm();
  }

  private resetForm(): void {
    this.contactForm = {
      nombre: '',
      email: '',
      telefono: '',
      asunto: '',
      mensaje: ''
    };
  }

  // Métodos para obtener información de la empresa con valores por defecto
  getTelefono(): string {
    return this.empresaInfo?.telefono || '+00 123 456 789';
  }

  getEmail(): string {
    return this.empresaInfo?.email || 'support24@marketpro.com';
  }

  getDireccion(): string {
    return this.empresaInfo?.direccion || '789 Inner Lane, California, USA';
  }

  getWhatsapp(): string {
    return this.empresaInfo?.whatsapp || this.getTelefono();
  }

  // Método para abrir WhatsApp
  abrirWhatsApp(): void {
    const numero = this.getWhatsappNumero();
    const mensaje = encodeURIComponent('Hola, me gustaría obtener más información sobre sus productos.');
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  }

  // Método para obtener número de WhatsApp limpio
  getWhatsappNumero(): string {
    const whatsapp = this.getWhatsapp();
    return whatsapp.replace(/[^0-9]/g, '');
  }

  // Método para obtener URL de WhatsApp
  getWhatsappUrl(): string {
    const numero = this.getWhatsappNumero();
    return `https://wa.me/${numero}`;
  }

  // Método para abrir Google Maps
  abrirMaps(): void {
    const direccion = encodeURIComponent(this.getDireccion());
    window.open(`https://www.google.com/maps/search/?api=1&query=${direccion}`, '_blank');
  }
}