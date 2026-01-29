import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FacturacionService } from '../../../services/facturacion.service';
import { 
  VentaFormData, 
  VentaItemFormData, 
  TIPOS_DOCUMENTO,
  TIPOS_AFECTACION_IGV,
  METODOS_PAGO,
  TIPOS_COMPROBANTE,
  Venta,
  Comprobante
} from '../../../models/facturacion.model';

@Component({
  selector: 'app-facturacion-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facturacion-test.component.html',
  styleUrls: ['./facturacion-test.component.scss']
})
export class FacturacionTestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Datos del formulario
  ventaForm: VentaFormData = {
    cliente: {
      tipo_documento: TIPOS_DOCUMENTO.DNI,
      numero_documento: '12345678',
      nombre: 'Juan Pérez',
      direccion: 'Av. Principal 123, Lima',
      email: 'juan@email.com',
      telefono: '987654321'
    },
    items: [
      {
        descripcion: 'Laptop HP Pavilion',
        unidad_medida: 'NIU',
        cantidad: 1,
        precio_unitario: 2500.00,
        tipo_afectacion_igv: TIPOS_AFECTACION_IGV.GRAVADO,
        descuento: 0,
        subtotal: 2500.00,
        igv: 450.00,
        total: 2950.00
      },
      {
        descripcion: 'Mouse Inalámbrico',
        unidad_medida: 'NIU',
        cantidad: 2,
        precio_unitario: 25.00,
        tipo_afectacion_igv: TIPOS_AFECTACION_IGV.GRAVADO,
        descuento: 0,
        subtotal: 50.00,
        igv: 9.00,
        total: 59.00
      }
    ],
    descuento_global: 0,
    metodo_pago: METODOS_PAGO.EFECTIVO,
    observaciones: 'Venta de prueba',
    moneda: 'PEN'
  };

  // Datos del comprobante generado
  comprobanteGenerado: Comprobante | null = null;
  mostrarComprobante = false;

  // Estados
  loading = false;
  error: string | null = null;
  success: string | null = null;
  ventaGuardada: Venta | null = null;

  constructor(private facturacionService: FacturacionService) {}

  // Constantes
  readonly TIPOS_DOCUMENTO = TIPOS_DOCUMENTO;
  readonly TIPOS_AFECTACION_IGV = TIPOS_AFECTACION_IGV;
  readonly METODOS_PAGO = METODOS_PAGO;
  readonly TIPOS_COMPROBANTE = TIPOS_COMPROBANTE;

  // Cálculos
  get subtotal(): number {
    return this.ventaForm.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  }

  get descuentoTotal(): number {
    const descuentoItems = this.ventaForm.items.reduce((sum, item) => sum + (item.descuento || 0), 0);
    return descuentoItems + (this.ventaForm.descuento_global || 0);
  }

  get subtotalNeto(): number {
    return this.subtotal - this.descuentoTotal;
  }

  get igv(): number {
    return this.subtotalNeto * 0.18; // 18% IGV
  }

  get total(): number {
    return this.subtotalNeto + this.igv;
  }


  ngOnInit(): void {
    this.calcularItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  calcularItems(): void {
    this.ventaForm.items.forEach(item => {
      const subtotal = item.cantidad * item.precio_unitario;
      const descuento = item.descuento || 0;
      const subtotalNeto = subtotal - descuento;
      
      let igv = 0;
      if (item.tipo_afectacion_igv === TIPOS_AFECTACION_IGV.GRAVADO) {
        igv = subtotalNeto * 0.18;
      }

      item.subtotal = subtotal;
      item.igv = igv;
      item.total = subtotalNeto + igv;
    });
  }

  generarBoleta(): void {
    this.procesarVentaCompleta('03');
  }

  generarFactura(): void {
    this.procesarVentaCompleta('01');
  }

  private procesarVentaCompleta(tipoComprobante: string): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    // Convertir VentaFormData a formato de nueva API
    const ventaData = {
      cliente_id: 1, // TODO: Obtener desde un selector de clientes
      productos: this.ventaForm.items.map(item => ({
        producto_id: 1, // TODO: Obtener desde items reales
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento_unitario: item.descuento || 0
      })),
      descuento_total: this.ventaForm.descuento_global || 0,
      metodo_pago: this.ventaForm.metodo_pago || 'EFECTIVO',
      observaciones: this.ventaForm.observaciones || null,
      requiere_factura: tipoComprobante === '01'
    };

    // Paso 1: Crear la venta
    this.facturacionService.createVenta(ventaData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.success = 'Venta creada exitosamente. ID: ' + response.data.id;

            // Si requiere facturación posterior
            if (tipoComprobante === '01') {
              this.facturarVenta(response.data.id, tipoComprobante);
            } else {
              this.loading = false;
            }
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = 'Error al crear venta: ' + (err.error?.message || err.message);
        }
      });
  }

  private facturarVenta(ventaId: number, tipoComprobante: string): void {
    const datosFacturacion = {
      cliente_datos: {
        tipo_documento: this.ventaForm.cliente.tipo_documento,
        numero_documento: this.ventaForm.cliente.numero_documento,
        razon_social: this.ventaForm.cliente.nombre,
        direccion: this.ventaForm.cliente.direccion || 'LIMA - PERÚ',
        email: this.ventaForm.cliente.email
      }
    };

    this.facturacionService.facturarVenta(ventaId, datosFacturacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.comprobanteGenerado = response.data;
            this.mostrarComprobante = true;
            const tipo = tipoComprobante === '01' ? 'Factura' : 'Boleta';
            this.success = `Comprobante ${tipo} generado exitosamente. Serie: ${response.data.serie} Número: ${response.data.numero}`;
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = 'Error al facturar venta: ' + (err.error?.message || err.message);
        }
      });
  }

  private generarComprobante(tipo: string, serie: string): void {
    const numero = Math.floor(Math.random() * 999999) + 1;
    const fecha = new Date();
    
    this.comprobanteGenerado = {
      empresa_id: 1, // ID de empresa por defecto
      tipo_comprobante: tipo as '01' | '03' | '07' | '08',
      serie: serie,
      numero: numero,
      numero_completo: `${serie}-${numero.toString().padStart(8, '0')}`,
      fecha_emision: fecha.toISOString().split('T')[0],
      hora_emision: fecha.toTimeString().split(' ')[0],
      cliente_tipo_documento: this.ventaForm.cliente.tipo_documento,
      cliente_numero_documento: this.ventaForm.cliente.numero_documento,
      cliente_nombre: this.ventaForm.cliente.nombre,
      cliente_direccion: this.ventaForm.cliente.direccion,
      items: this.ventaForm.items.map(item => ({
        comprobante_id: 0, // Se asignará cuando se guarde en la base de datos
        producto_id: item.producto_id,
        descripcion: item.descripcion,
        unidad_medida: item.unidad_medida,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        tipo_afectacion_igv: item.tipo_afectacion_igv,
        descuento: item.descuento || 0,
        subtotal: item.subtotal || 0,
        igv: item.igv || 0,
        total: item.total || 0
      })),
      subtotal: this.subtotal,
      descuentos: this.descuentoTotal,
      igv: this.igv,
      total: this.total,
      moneda: this.ventaForm.moneda || 'PEN',
      observaciones: this.ventaForm.observaciones,
      estado_sunat: 'ACEPTADO',
      codigo_sunat: '0',
      mensaje_sunat: 'El comprobante ha sido aceptado',
      hash: this.generarHash(),
      leyendas: [
        {
          codigo: '1000',
          valor: `SON: ${this.numeroALetras(this.total)} SOLES`
        }
      ]
    };

    this.mostrarComprobante = true;
  }

  private generarHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generarQRData(): string {
    if (!this.comprobanteGenerado) return '';
    
    const empresa = {
      ruc: '20123456789',
      razon_social: 'MI EMPRESA SAC',
      direccion: 'Av. Principal 123, Lima'
    };

    const comprobante = this.comprobanteGenerado;
    
    return `${empresa.ruc}|${comprobante.tipo_comprobante}|${comprobante.serie}|${comprobante.numero}|${comprobante.igv}|${comprobante.total}|${comprobante.fecha_emision}|${comprobante.cliente_tipo_documento}|${comprobante.cliente_numero_documento}|${comprobante.hash}`;
  }

  private numeroALetras(numero: number): string {
    // Función simplificada para convertir números a letras
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const entero = Math.floor(numero);
    const decimal = Math.round((numero - entero) * 100);

    if (entero === 0) return 'CERO SOLES';
    if (entero === 1) return 'UN SOL';
    if (entero < 10) return `${unidades[entero]} SOLES`;
    if (entero < 100) {
      const decena = Math.floor(entero / 10);
      const unidad = entero % 10;
      if (unidad === 0) return `${decenas[decena]} SOLES`;
      return `${decenas[decena]} Y ${unidades[unidad]} SOLES`;
    }
    if (entero < 1000) {
      const centena = Math.floor(entero / 100);
      const resto = entero % 100;
      if (resto === 0) return `${centenas[centena]} SOLES`;
      return `${centenas[centena]} ${this.numeroALetras(resto).toLowerCase()}`;
    }

    return `${entero} SOLES`;
  }

  imprimirComprobante(): void {
    window.print();
  }

  descargarPDF(): void {
    // Simular descarga de PDF
    const blob = new Blob(['PDF simulado'], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.comprobanteGenerado?.numero_completo || 'comprobante'}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  enviarEmail(): void {
    // Simular envío de email
    alert(`Comprobante enviado por email a: ${this.ventaForm.cliente.email}`);
  }

  nuevaVenta(): void {
    this.comprobanteGenerado = null;
    this.mostrarComprobante = false;
  }
}