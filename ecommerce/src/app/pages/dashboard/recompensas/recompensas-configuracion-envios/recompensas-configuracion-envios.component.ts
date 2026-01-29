import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecompensasService } from '../../../../services/recompensas.service';

export interface ZonaEnvio {
  id: string;
  nombre: string;
  departamento: string;
  provincia: string;
  distrito: string;
  costo_envio: number;
}

export interface ConfiguracionEnviosData {
  minimo_compra: number;
  todas_las_zonas: boolean;
  zonas_especificas: ZonaEnvio[];
  incluir_lima: boolean;
  incluir_provincias: boolean;
  costo_envio_gratis: number;
}

@Component({
  selector: 'app-recompensas-configuracion-envios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recompensas-configuracion-envios.component.html',
  styleUrls: ['./recompensas-configuracion-envios.component.scss']
})
export class RecompensasConfiguracionEnviosComponent implements OnInit {
  @Input() recompensaId?: number;
  @Input() configuracionInicial?: ConfiguracionEnviosData;
  @Output() configuracionChange = new EventEmitter<ConfiguracionEnviosData>();

  private recompensasService = inject(RecompensasService);
  private fb = inject(FormBuilder);

  configuracionForm: FormGroup;
  loading = false;
  error: string | null = null;

  // Datos para búsqueda
  departamentos: any[] = [];
  provincias: any[] = [];
  distritos: any[] = [];
  zonasDisponibles: ZonaEnvio[] = [];
  zonasSeleccionadas: ZonaEnvio[] = [];

  // Filtros de búsqueda
  filtroDepartamento = '';
  filtroProvincia = '';
  filtroDistrito = '';
  terminoBusqueda = '';

  // Estadísticas
  estadisticasCobertura = {
    total_zonas: 0,
    zonas_cubiertas: 0,
    porcentaje_cobertura: 0,
    departamentos_cubiertos: 0,
    provincias_cubiertas: 0
  };

  constructor() {
    this.configuracionForm = this.fb.group({
      minimo_compra: [0, [Validators.required, Validators.min(0)]],
      todas_las_zonas: [false],
      incluir_lima: [false],
      incluir_provincias: [false],
      costo_envio_gratis: [0, [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.configuracionInicial) {
      this.configuracionForm.patchValue(this.configuracionInicial);
      this.zonasSeleccionadas = this.configuracionInicial.zonas_especificas || [];
    }

    // Cargar configuración existente si hay recompensaId
    if (this.recompensaId) {
      this.cargarConfiguracion();
    }

    // Cargar datos iniciales
    this.cargarDepartamentos();
    this.cargarEstadisticasCobertura();

    // Escuchar cambios en el formulario
    this.configuracionForm.valueChanges.subscribe(() => {
      this.emitirConfiguracion();
    });
  }

  cargarConfiguracion(): void {
    if (!this.recompensaId) return;

    this.loading = true;
    this.error = null;

    this.recompensasService.obtenerConfiguracionEnvios(this.recompensaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.configuracionForm.patchValue(response.data);
          this.zonasSeleccionadas = response.data.zonas_especificas || [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración de envíos:', error);
        this.error = 'Error al cargar la configuración';
        this.loading = false;
      }
    });
  }

  cargarDepartamentos(): void {
    this.recompensasService.obtenerDepartamentos().subscribe({
      next: (response) => {
        if (response.success) {
          this.departamentos = response.data;
        }
      },
      error: (error) => {
        console.error('Error cargando departamentos:', error);
      }
    });
  }

  cargarProvincias(departamento: string): void {
    if (!departamento) {
      this.provincias = [];
      this.distritos = [];
      return;
    }

    this.recompensasService.buscarZonas({ departamento }).subscribe({
      next: (response) => {
        if (response.success) {
          this.provincias = [...new Set(response.data.map((zona: any) => zona.provincia))];
        }
      },
      error: (error) => {
        console.error('Error cargando provincias:', error);
      }
    });
  }

  cargarDistritos(provincia: string): void {
    if (!provincia) {
      this.distritos = [];
      return;
    }

    this.recompensasService.buscarZonas({ 
      departamento: this.filtroDepartamento, 
      provincia 
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.distritos = [...new Set(response.data.map((zona: any) => zona.distrito))];
        }
      },
      error: (error) => {
        console.error('Error cargando distritos:', error);
      }
    });
  }

  buscarZonas(): void {
    const filtros: any = {};
    
    if (this.terminoBusqueda) filtros.buscar = this.terminoBusqueda;
    if (this.filtroDepartamento) filtros.departamento = this.filtroDepartamento;
    if (this.filtroProvincia) filtros.provincia = this.filtroProvincia;
    if (this.filtroDistrito) filtros.distrito = this.filtroDistrito;

    this.recompensasService.buscarZonas(filtros).subscribe({
      next: (response) => {
        if (response.success) {
          this.zonasDisponibles = response.data;
        }
      },
      error: (error) => {
        console.error('Error buscando zonas:', error);
      }
    });
  }

  cargarEstadisticasCobertura(): void {
    if (!this.recompensaId) return;

    this.recompensasService.obtenerEstadisticasCobertura(this.recompensaId).subscribe({
      next: (response) => {
        if (response.success) {
          this.estadisticasCobertura = response.data;
        }
      },
      error: (error) => {
        console.error('Error cargando estadísticas de cobertura:', error);
      }
    });
  }

  agregarZona(zona: ZonaEnvio): void {
    if (!this.zonasSeleccionadas.find(z => z.id === zona.id)) {
      this.zonasSeleccionadas.push(zona);
      this.actualizarFormulario();
    }
  }

  removerZona(zonaId: string): void {
    this.zonasSeleccionadas = this.zonasSeleccionadas.filter(z => z.id !== zonaId);
    this.actualizarFormulario();
  }

  seleccionarTodasLasZonas(): void {
    const todasLasZonas = this.configuracionForm.get('todas_las_zonas')?.value;
    this.configuracionForm.patchValue({
      incluir_lima: todasLasZonas,
      incluir_provincias: todasLasZonas
    });
    this.actualizarFormulario();
  }

  validarEnvio(): void {
    if (!this.recompensaId) return;

    this.loading = true;
    const configuracion = this.configuracionForm.value;

    this.recompensasService.validarEnvio(this.recompensaId, configuracion).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Configuración de envío válida:', response.data);
        } else {
          this.error = response.message || 'Configuración inválida';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error validando envío:', error);
        this.error = 'Error al validar la configuración';
        this.loading = false;
      }
    });
  }

  guardarConfiguracion(): void {
    if (this.configuracionForm.invalid || !this.recompensaId) return;

    this.loading = true;
    this.error = null;

    const configuracion = {
      ...this.configuracionForm.value,
      zonas_especificas: this.zonasSeleccionadas
    };

    this.recompensasService.crearConfiguracionEnvios(this.recompensaId, configuracion).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Configuración de envíos guardada:', response.data);
          this.emitirConfiguracion();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error guardando configuración de envíos:', error);
        this.error = 'Error al guardar la configuración';
        this.loading = false;
      }
    });
  }

  private actualizarFormulario(): void {
    this.configuracionForm.patchValue({
      zonas_especificas: this.zonasSeleccionadas
    });
    this.emitirConfiguracion();
  }

  private emitirConfiguracion(): void {
    if (this.configuracionForm.valid) {
      const configuracion = {
        ...this.configuracionForm.value,
        zonas_especificas: this.zonasSeleccionadas
      };
      this.configuracionChange.emit(configuracion);
    }
  }

  getTodasLasZonas(): boolean {
    return this.configuracionForm.get('todas_las_zonas')?.value;
  }

  getZonasSeleccionadasCount(): number {
    return this.zonasSeleccionadas.length;
  }

  getCoberturaTexto(): string {
    const porcentaje = this.estadisticasCobertura.porcentaje_cobertura;
    if (porcentaje >= 80) return 'Excelente cobertura';
    if (porcentaje >= 60) return 'Buena cobertura';
    if (porcentaje >= 40) return 'Cobertura moderada';
    return 'Cobertura limitada';
  }

  getCoberturaClass(): string {
    const porcentaje = this.estadisticasCobertura.porcentaje_cobertura;
    if (porcentaje >= 80) return 'text-success';
    if (porcentaje >= 60) return 'text-info';
    if (porcentaje >= 40) return 'text-warning';
    return 'text-danger';
  }

  isZonaSeleccionada(zonaId: string): boolean {
    return this.zonasSeleccionadas.some(z => z.id === zonaId);
  }
}
