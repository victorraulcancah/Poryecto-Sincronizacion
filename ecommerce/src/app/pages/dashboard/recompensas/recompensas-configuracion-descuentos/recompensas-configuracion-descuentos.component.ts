import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecompensasService } from '../../../../services/recompensas.service';

export interface ConfiguracionDescuentosData {
  tipo_descuento: 'porcentaje' | 'cantidad_fija';
  valor_descuento: number;
  compra_minima: number;
  maximo_descuento?: number;
  aplicable_primera_compra: boolean;
  combinable_con_ofertas: boolean;
}

@Component({
  selector: 'app-recompensas-configuracion-descuentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recompensas-configuracion-descuentos.component.html',
  styleUrls: ['./recompensas-configuracion-descuentos.component.scss']
})
export class RecompensasConfiguracionDescuentosComponent implements OnInit {
  @Input() recompensaId?: number;
  @Input() configuracionInicial?: ConfiguracionDescuentosData;
  @Output() configuracionChange = new EventEmitter<ConfiguracionDescuentosData>();

  private recompensasService = inject(RecompensasService);
  private fb = inject(FormBuilder);

  configuracionForm: FormGroup;
  loading = false;
  error: string | null = null;

  tiposDescuento = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'cantidad_fija', label: 'Cantidad Fija (S/)' }
  ];

  simulacion = {
    monto_compra: 0,
    descuento_aplicado: 0,
    monto_final: 0,
    calculando: false
  };

  ejemplosSimulacion = [
    { monto: 50, label: 'Compra pequeña' },
    { monto: 150, label: 'Compra media' },
    { monto: 300, label: 'Compra grande' },
    { monto: 500, label: 'Compra premium' }
  ];

  constructor() {
    this.configuracionForm = this.fb.group({
      tipo_descuento: ['porcentaje', Validators.required],
      valor_descuento: [0, [Validators.required, Validators.min(0)]],
      compra_minima: [0, [Validators.required, Validators.min(0)]],
      maximo_descuento: [0, [Validators.min(0)]],
      aplicable_primera_compra: [false],
      combinable_con_ofertas: [false]
    });
  }

  ngOnInit(): void {
    if (this.configuracionInicial) {
      this.configuracionForm.patchValue(this.configuracionInicial);
    }

    // Cargar configuración existente si hay recompensaId
    if (this.recompensaId) {
      this.cargarConfiguracion();
    }

    // Escuchar cambios en el formulario
    this.configuracionForm.valueChanges.subscribe(() => {
      this.emitirConfiguracion();
    });
  }

  cargarConfiguracion(): void {
    if (!this.recompensaId) return;

    this.loading = true;
    this.error = null;

    this.recompensasService.obtenerConfiguracionDescuentos(this.recompensaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.configuracionForm.patchValue(response.data);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración de descuentos:', error);
        this.error = 'Error al cargar la configuración';
        this.loading = false;
      }
    });
  }

  simularDescuento(): void {
    if (this.simulacion.monto_compra <= 0) return;

    this.simulacion.calculando = true;
    const formValue = this.configuracionForm.value;

    const datosSimulacion = {
      monto_compra: this.simulacion.monto_compra,
      tipo_descuento: formValue.tipo_descuento,
      valor_descuento: formValue.valor_descuento,
      compra_minima: formValue.compra_minima
    };

    this.recompensasService.simularDescuentos(this.recompensaId!, datosSimulacion).subscribe({
      next: (response) => {
        if (response.success) {
          this.simulacion.descuento_aplicado = response.data.descuento_aplicado;
          this.simulacion.monto_final = response.data.monto_final;
        }
        this.simulacion.calculando = false;
      },
      error: (error) => {
        console.error('Error simulando descuento:', error);
        this.simulacion.calculando = false;
        // Calcular manualmente como fallback
        this.calcularDescuentoManual();
      }
    });
  }

  calcularDescuentoManual(): void {
    const formValue = this.configuracionForm.value;
    const monto = this.simulacion.monto_compra;

    if (monto < formValue.compra_minima) {
      this.simulacion.descuento_aplicado = 0;
      this.simulacion.monto_final = monto;
      return;
    }

    let descuento = 0;
    if (formValue.tipo_descuento === 'porcentaje') {
      descuento = (monto * formValue.valor_descuento) / 100;
      if (formValue.maximo_descuento && descuento > formValue.maximo_descuento) {
        descuento = formValue.maximo_descuento;
      }
    } else {
      descuento = formValue.valor_descuento;
    }

    this.simulacion.descuento_aplicado = descuento;
    this.simulacion.monto_final = monto - descuento;
  }

  simularConEjemplo(monto: number): void {
    this.simulacion.monto_compra = monto;
    this.simularDescuento();
  }

  guardarConfiguracion(): void {
    if (this.configuracionForm.invalid || !this.recompensaId) return;

    this.loading = true;
    this.error = null;

    const configuracion = this.configuracionForm.value;

    this.recompensasService.crearConfiguracionDescuentos(this.recompensaId, configuracion).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Configuración de descuentos guardada:', response.data);
          this.emitirConfiguracion();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error guardando configuración de descuentos:', error);
        this.error = 'Error al guardar la configuración';
        this.loading = false;
      }
    });
  }

  validarConfiguracion(): void {
    if (!this.recompensaId) return;

    this.loading = true;
    const configuracion = this.configuracionForm.value;

    this.recompensasService.validarConfiguracionDescuentos(configuracion).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Configuración válida:', response.data);
        } else {
          this.error = response.message || 'Configuración inválida';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error validando configuración:', error);
        this.error = 'Error al validar la configuración';
        this.loading = false;
      }
    });
  }

  private emitirConfiguracion(): void {
    if (this.configuracionForm.valid) {
      this.configuracionChange.emit(this.configuracionForm.value);
    }
  }

  getTipoDescuentoLabel(): string {
    const tipo = this.configuracionForm.get('tipo_descuento')?.value;
    return tipo === 'porcentaje' ? '%' : 'S/';
  }

  getMaximoDescuentoVisible(): boolean {
    return this.configuracionForm.get('tipo_descuento')?.value === 'porcentaje';
  }
}
