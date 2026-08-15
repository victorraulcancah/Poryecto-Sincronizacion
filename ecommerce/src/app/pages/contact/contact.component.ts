// src\app\pages\contact\contact.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { EmpresaInfoService } from '../../services/empresa-info.service';
import { ContactoService } from '../../services/contacto.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

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

  /** El formulario se bloquea mientras se envía. */
  enviando = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private empresaInfoService: EmpresaInfoService,
    private contactoService: ContactoService
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
      Swal.fire({
        title: 'Faltan datos',
        text: 'Por favor, complete todos los campos obligatorios.',
        icon: 'warning',
      });
      return;
    }

    if (this.enviando) return;
    this.enviando = true;

    // El mensaje se guarda en el backend y se avisa por correo a la empresa.
    this.contactoService
      .enviar(this.contactForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.enviando = false;
          Swal.fire({
            title: '¡Mensaje enviado!',
            text: 'Nos pondremos en contacto contigo pronto.',
            icon: 'success',
          });
          this.resetForm();
        },
        error: (error) => {
          this.enviando = false;
          console.error('Error al enviar el mensaje de contacto:', error);
          Swal.fire({
            title: 'No se pudo enviar',
            text:
              error?.error?.message ||
              'Ocurrió un problema al enviar tu mensaje. Inténtalo de nuevo en unos minutos.',
            icon: 'error',
          });
        },
      });
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

  getTelefono(): string | null {
    return this.empresaInfo?.telefono || null;
  }

  getEmail(): string | null {
    return this.empresaInfo?.email || null;
  }

  getDireccion(): string | null {
    return this.empresaInfo?.direccion || null;
  }

  getWhatsapp(): string | null {
    return this.empresaInfo?.whatsapp || null;
  }

  abrirWhatsApp(): void {
    const whatsapp = this.getWhatsapp();
    if (!whatsapp) return;
    const numero = whatsapp.replace(/[^0-9]/g, '');
    const mensaje = encodeURIComponent('Hola, me gustaría obtener más información sobre sus productos.');
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  }

  getWhatsappUrl(): string | null {
    const whatsapp = this.getWhatsapp();
    if (!whatsapp) return null;
    const numero = whatsapp.replace(/[^0-9]/g, '');
    return `https://wa.me/${numero}`;
  }

  abrirMaps(): void {
    const direccion = this.getDireccion();
    if (!direccion) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`, '_blank');
  }
}