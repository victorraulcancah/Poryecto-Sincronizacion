import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { FacturacionService } from '../../../services/facturacion.service';
import { Empresa, Certificado, Serie } from '../../../models/facturacion.model';

@Component({
  selector: 'app-facturacion-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facturacion-config.component.html',
  styleUrls: ['./facturacion-config.component.scss']
})
export class FacturacionConfigComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos del emisor
  empresa: Empresa = {
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    domicilio_fiscal: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    urbanizacion: '',
    codigo_local: '0000',
    email: '',
    telefono: '',
    web: '',
    logo_path: '',
    sol_usuario: '',
    sol_endpoint: 'beta',
    estado: 'activo'
  };

  // Certificado
  certificado: Certificado | null = null;
  certificadoFile: File | null = null;
  certificadoPassword = '';

  // Series
  series: Serie[] = [];
  nuevaSerie: Partial<Serie> = {
    tipo_comprobante: '01',
    serie: '',
    correlativo_actual: 1,
    correlativo_minimo: 1,
    correlativo_maximo: 99999999,
    estado: 'activo',
    descripcion: ''
  };

  // Estados
  loading = false;
  error: string | null = null;
  success: string | null = null;
  activeTab = 'empresa';

  // Constantes
  readonly TIPOS_COMPROBANTE = [
    { value: '01', label: 'Factura' },
    { value: '03', label: 'Boleta' },
    { value: '07', label: 'Nota de Crédito' },
    { value: '08', label: 'Nota de Débito' }
  ];

  readonly ENDPOINTS = [
    { value: 'beta', label: 'Beta (Pruebas)' },
    { value: 'prod', label: 'Producción' }
  ];

  constructor(private facturacionService: FacturacionService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  private cargarDatos(): void {
    this.cargarEmisor();
    this.cargarSeries();
  }

  private cargarEmisor(): void {
    this.facturacionService.getEmisor()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.empresa = response.data;
          }
        },
        error: (error) => {
          console.error('Error al cargar emisor:', error);
        }
      });
  }

  private cargarSeries(): void {
    this.facturacionService.getSeries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.series = response.data;
          }
        },
        error: (error) => {
          console.error('Error al cargar series:', error);
        }
      });
  }

  // ============================================
  // GESTIÓN DE EMPRESA
  // ============================================

  guardarEmpresa(): void {
    if (!this.validarEmpresa()) return;

    this.loading = true;
    this.error = null;
    this.success = null;

    this.facturacionService.updateEmisor(this.empresa)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = 'Configuración de empresa guardada exitosamente';
            this.empresa = response.data || this.empresa;
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Error al guardar la configuración';
        }
      });
  }

  private validarEmpresa(): boolean {
    if (!this.empresa.ruc.trim()) {
      this.error = 'El RUC es obligatorio';
      return false;
    }

    if (!this.empresa.razon_social.trim()) {
      this.error = 'La razón social es obligatoria';
      return false;
    }

    if (!this.empresa.domicilio_fiscal.trim()) {
      this.error = 'El domicilio fiscal es obligatorio';
      return false;
    }

    if (!this.empresa.ubigeo.trim()) {
      this.error = 'El ubigeo es obligatorio';
      return false;
    }

    return true;
  }

  // ============================================
  // GESTIÓN DE CERTIFICADO
  // ============================================

  onCertificadoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.certificadoFile = file;
    }
  }

  subirCertificado(): void {
    if (!this.certificadoFile) {
      this.error = 'Debe seleccionar un archivo de certificado';
      return;
    }

    if (!this.certificadoPassword.trim()) {
      this.error = 'Debe ingresar la contraseña del certificado';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    this.facturacionService.uploadCertificado(this.certificadoFile, this.certificadoPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = 'Certificado subido exitosamente';
            this.certificado = response.data || null;
            this.certificadoFile = null;
            this.certificadoPassword = '';
            // Limpiar el input file
            const fileInput = document.getElementById('certificado') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Error al subir el certificado';
        }
      });
  }

  // ============================================
  // GESTIÓN DE SERIES
  // ============================================

  agregarSerie(): void {
    if (!this.validarSerie()) return;

    this.loading = true;
    this.error = null;
    this.success = null;

    this.facturacionService.createSerie(this.nuevaSerie)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.success = 'Serie creada exitosamente';
            this.series.push(response.data);
            this.limpiarNuevaSerie();
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Error al crear la serie';
        }
      });
  }

  actualizarSerie(serie: Serie): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    this.facturacionService.updateSerie(serie.id!, {
      correlativo_actual: serie.correlativo_actual,
      estado: serie.estado,
      descripcion: serie.descripcion
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = 'Serie actualizada exitosamente';
            const index = this.series.findIndex(s => s.id === serie.id);
            if (index !== -1) {
              this.series[index] = response.data || this.series[index];
            }
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Error al actualizar la serie';
        }
      });
  }

  reservarCorrelativo(serie: Serie): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    this.facturacionService.reservarCorrelativo(serie.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = 'Correlativo reservado exitosamente';
            this.cargarSeries(); // Recargar para obtener el nuevo correlativo
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Error al reservar correlativo';
        }
      });
  }

  private validarSerie(): boolean {
    if (!this.nuevaSerie.tipo_comprobante) {
      this.error = 'Debe seleccionar el tipo de comprobante';
      return false;
    }

    if (!this.nuevaSerie.serie?.trim()) {
      this.error = 'La serie es obligatoria';
      return false;
    }

    if (!this.nuevaSerie.correlativo_actual || this.nuevaSerie.correlativo_actual < 1) {
      this.error = 'El correlativo inicial debe ser mayor a 0';
      return false;
    }

    return true;
  }

  private limpiarNuevaSerie(): void {
    this.nuevaSerie = {
      tipo_comprobante: '01',
      serie: '',
      correlativo_actual: 1,
      correlativo_minimo: 1,
      correlativo_maximo: 99999999,
      estado: 'activo',
      descripcion: ''
    };
  }

  // ============================================
  // UTILIDADES
  // ============================================

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.error = null;
    this.success = null;
  }

  cerrarMensajes(): void {
    this.error = null;
    this.success = null;
  }

  getTipoComprobanteLabel(value: string): string {
    const tipo = this.TIPOS_COMPROBANTE.find(t => t.value === value);
    return tipo ? tipo.label : value;
  }

  getEndpointLabel(value: string): string {
    const endpoint = this.ENDPOINTS.find(e => e.value === value);
    return endpoint ? endpoint.label : value;
  }
}