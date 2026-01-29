// src/app/pages/dashboard/ventas/nueva-venta.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VentasService } from '../../../services/ventas.service';
import { AlmacenService } from '../../../services/almacen.service';
import { FacturacionService } from '../../../services/facturacion.service';
import { ClienteService } from '../../../services/cliente.service';
import { ReniecService } from '../../../services/reniec.service';
import { Producto } from '../../../types/almacen.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './nueva-venta.component.html',
  styles: [`
    .table td {
      vertical-align: middle;
    }
    .border-primary {
      border-color: #007bff !important;
    }
  `],
})
export class NuevaVentaComponent implements OnInit {
  ventaForm: FormGroup;
  productos: Producto[] = [];
  isLoading = false;

  // Totales
  subtotal = 0;
  igv = 0;
  total = 0;

  // Mensajes
  errorMessage: string | null = null;
  successMessage: string | null = null;





  constructor(
    private fb: FormBuilder,
    private ventasService: VentasService,
    private almacenService: AlmacenService,
    private facturacionService: FacturacionService,
    private clienteService: ClienteService,
    private reniecService: ReniecService,
    private router: Router
  ) {
    this.ventaForm = this.fb.group({
      cliente: this.fb.group({
        tipo_documento: ['1', Validators.required],
        numero_documento: ['', Validators.required],
        nombre: ['', Validators.required],
        direccion: [''],
        email: [''],
        telefono: ['']
      }),
      metodo_pago: ['', Validators.required],
      observaciones: [''],
      descuento_total: [0, [Validators.min(0)]],
      productos: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.agregarProducto(); // Agregar una línea inicial
  }

  buscarCliente(): void {
    const numeroDocumento = this.ventaForm.get('cliente.numero_documento')?.value;
    const tipoDocumento = this.ventaForm.get('cliente.tipo_documento')?.value;
    
    if (!numeroDocumento) {
      Swal.fire({
        title: 'Campo requerido',
        text: 'Ingrese el número de documento',
        icon: 'warning',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    // Mostrar loading
    Swal.fire({
      title: 'Buscando cliente...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // PASO 1: Buscar en la base de datos (PRIORIDAD)
    this.clienteService.buscarPorDocumento(numeroDocumento).subscribe({
      next: (response) => {
        console.log('🔍 Respuesta del sistema:', response);
        console.log('✅ Success:', response.success);
        console.log('📦 Data recibida:', response.data);

        // El backend ahora devuelve: { success: true, data: [cliente] } o { success: false, data: [] }
        if (response.success && response.data && response.data.length > 0) {
          // ✅ CLIENTE ENCONTRADO EN SISTEMA
          const cliente = response.data[0];
          console.log('👤 Cliente encontrado en sistema:', cliente);

          // Usar nombre_completo si existe, sino construir desde nombres + apellidos
          const nombreCompleto = cliente.nombre_completo ||
                                 `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim();
          console.log('📝 Nombre completo:', nombreCompleto);

          this.ventaForm.patchValue({
            cliente: {
              tipo_documento: tipoDocumento,
              numero_documento: cliente.numero_documento,
              nombre: nombreCompleto || 'Cliente',
              direccion: cliente.direccion || '',
              email: cliente.email || '',
              telefono: cliente.telefono || ''
            }
          });

          Swal.fire({
            title: '✅ Cliente Encontrado en Sistema',
            html: `
              <div class="text-start">
                <div class="alert alert-success">
                  <strong>Cliente registrado en el sistema</strong>
                </div>
                <p><strong>ID:</strong> ${cliente.id_cliente}</p>
                <p><strong>Nombre:</strong> ${nombreCompleto}</p>
                <p><strong>Documento:</strong> ${cliente.numero_documento}</p>
                ${cliente.direccion ? `<p><strong>Dirección:</strong> ${cliente.direccion}</p>` : ''}
                ${cliente.email ? `<p><strong>Email:</strong> ${cliente.email}</p>` : ''}
                ${cliente.telefono ? `<p><strong>Teléfono:</strong> ${cliente.telefono}</p>` : ''}
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#198754'
          });
        } else {
          // ❌ NO ENCONTRADO EN SISTEMA
          console.log('❌ Cliente no encontrado en sistema (success=false)');
          console.log('📝 Mensaje del backend:', response.message);

          Swal.fire({
            title: 'Cliente no encontrado',
            text: 'El documento no está registrado en el sistema. Puede ingresar los datos manualmente.',
            icon: 'warning',
            confirmButtonColor: '#ffc107'
          });

          // this.buscarEnReniecSunat(numeroDocumento, tipoDocumento); // DESACTIVADO
        }
      },
      error: (error) => {
        console.error('❌ Error al buscar en sistema:', error);
        console.error('📄 Detalle del error:', error.error);

        Swal.fire({
          title: 'Error',
          text: 'Error al buscar en el sistema.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });

        // this.buscarEnReniecSunat(numeroDocumento, tipoDocumento); // DESACTIVADO
      }
    });
  }

  /**
   * Buscar en RENIEC (DNI) o SUNAT (RUC) cuando no se encuentra en DB
   */
  private buscarEnReniecSunat(numeroDocumento: string, tipoDocumento: string): void {
    // Determinar si es DNI (8 dígitos) o RUC (11 dígitos)
    const esDni = numeroDocumento.length === 8;
    const esRuc = numeroDocumento.length === 11;

    if (!esDni && !esRuc) {
      Swal.fire({
        title: 'Documento no válido',
        html: `
          <div class="text-start">
            <p>El documento debe tener:</p>
            <ul>
              <li><strong>8 dígitos</strong> para DNI</li>
              <li><strong>11 dígitos</strong> para RUC</li>
            </ul>
            <p class="text-muted">Puede continuar ingresando los datos manualmente.</p>
          </div>
        `,
        icon: 'warning',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (esDni) {
      // Buscar en RENIEC
      this.reniecService.buscarPorDni(numeroDocumento).subscribe({
        next: (response) => {
          console.log('🔍 Respuesta de RENIEC:', response);

          // RENIEC no devuelve "success", solo verifica si tiene datos
          if (response.nombres || response.nombre) {
            // Construir nombre completo
            const nombreCompleto = response.nombre ||
              `${response.nombres} ${response.apellidoPaterno} ${response.apellidoMaterno}`;

            console.log('✅ Nombre encontrado en RENIEC:', nombreCompleto);

            this.ventaForm.patchValue({
              cliente: {
                tipo_documento: '1', // DNI
                numero_documento: numeroDocumento,
                nombre: nombreCompleto.trim()
              }
            });

            Swal.fire({
              title: '✅ Datos Encontrados en RENIEC',
              html: `
                <div class="text-start">
                  <div class="alert alert-info">
                    <strong>Cliente nuevo - Datos de RENIEC</strong>
                  </div>
                  <p><strong>DNI:</strong> ${numeroDocumento}</p>
                  <p><strong>Nombre:</strong> ${nombreCompleto}</p>
                  <p class="text-muted small">Complete los datos adicionales si lo desea.</p>
                </div>
              `,
              icon: 'success',
              confirmButtonColor: '#198754'
            });
          } else {
            console.log('❌ No se encontraron datos en RENIEC');
            this.mostrarClienteNoEncontrado();
          }
        },
        error: (error) => {
          console.error('❌ Error al buscar en RENIEC:', error);
          this.mostrarClienteNoEncontrado();
        }
      });
    } else if (esRuc) {
      // Buscar en SUNAT (RUC)
      this.reniecService.buscarPorDni(numeroDocumento).subscribe({
        next: (response) => {
          console.log('🔍 Respuesta de SUNAT:', response);

          // SUNAT devuelve razonSocial y dirección
          if (response.razonSocial || response.nombre) {
            const razonSocial = response.razonSocial || response.nombre || '';
            const direccion = response.direccion || '';

            console.log('✅ RUC encontrado en SUNAT:', razonSocial);
            console.log('📍 Dirección:', direccion);

            this.ventaForm.patchValue({
              cliente: {
                tipo_documento: '6', // RUC
                numero_documento: numeroDocumento,
                nombre: razonSocial.trim(),
                direccion: direccion.trim()
              }
            });

            Swal.fire({
              title: '✅ Datos Encontrados en SUNAT',
              html: `
                <div class="text-start">
                  <div class="alert alert-info">
                    <strong>Empresa nueva - Datos de SUNAT</strong>
                  </div>
                  <p><strong>RUC:</strong> ${numeroDocumento}</p>
                  <p><strong>Razón Social:</strong> ${razonSocial}</p>
                  ${response.estado ? `<p><strong>Estado:</strong> ${response.estado}</p>` : ''}
                  ${response.condicion ? `<p><strong>Condición:</strong> ${response.condicion}</p>` : ''}
                  ${direccion ? `<p><strong>Dirección:</strong> ${direccion}</p>` : ''}
                  ${response.departamento ? `<p><strong>Ubicación:</strong> ${response.distrito}, ${response.provincia}, ${response.departamento}</p>` : ''}
                  <p class="text-muted small">Complete los datos adicionales si lo desea.</p>
                </div>
              `,
              icon: 'success',
              confirmButtonColor: '#198754'
            });
          } else {
            console.log('❌ No se encontraron datos en SUNAT');
            Swal.fire({
              title: 'RUC no encontrado',
              html: `
                <div class="text-start">
                  <div class="alert alert-warning">
                    <strong>RUC no registrado</strong>
                  </div>
                  <p>El RUC <strong>${numeroDocumento}</strong> no se encontró en SUNAT.</p>
                  <p class="text-muted">Puede continuar ingresando los datos manualmente:</p>
                  <ul class="text-muted">
                    <li>Razón Social</li>
                    <li>Dirección</li>
                    <li>Email y Teléfono (opcional)</li>
                  </ul>
                </div>
              `,
              icon: 'warning',
              confirmButtonColor: '#ffc107'
            });
          }
        },
        error: (error) => {
          console.error('❌ Error al buscar en SUNAT:', error);
          Swal.fire({
            title: 'Error al buscar RUC',
            html: `
              <div class="text-start">
                <div class="alert alert-danger">
                  <strong>No se pudo consultar SUNAT</strong>
                </div>
                <p>Hubo un error al buscar el RUC <strong>${numeroDocumento}</strong>.</p>
                <p class="text-muted">Puede continuar ingresando los datos manualmente.</p>
              </div>
            `,
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
        }
      });
    }
  }

  /**
   * Mostrar mensaje cuando no se encuentra el cliente en ningún lado
   */
  private mostrarClienteNoEncontrado(): void {
    Swal.fire({
      title: 'Cliente no encontrado',
      html: `
        <div class="text-start">
          <div class="alert alert-warning">
            <strong>No se encontraron datos</strong>
          </div>
          <p>El documento no está registrado en:</p>
          <ul>
            <li>Base de datos del sistema</li>
            <li>RENIEC</li>
          </ul>
          <p class="text-muted">Puede continuar ingresando los datos manualmente.</p>
        </div>
      `,
      icon: 'warning',
      confirmButtonColor: '#ffc107'
    });
  }

  cerrarMensajes(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  get productosArray(): FormArray {
    return this.ventaForm.get('productos') as FormArray;
  }

  cargarProductos(): void {
    this.almacenService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos = productos.filter(p => p.activo && p.stock > 0);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
      }
    });
  }

  agregarProducto(): void {
    const productoGroup = this.fb.group({
      producto_id: ['', Validators.required],
      codigo_producto: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      unidad_medida: ['NIU', Validators.required],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
      descuento_unitario: [0, [Validators.min(0)]],
      tipo_afectacion_igv: ['10', Validators.required]
    });

    this.productosArray.push(productoGroup);
  }

  eliminarProducto(index: number): void {
    this.productosArray.removeAt(index);
    this.calcularTotales();
  }

  onProductoChange(index: number): void {
    const productoId = this.productosArray.at(index).get('producto_id')?.value;
    const producto = this.productos.find(p => p.id == productoId);

    if (producto) {
      this.productosArray.at(index).patchValue({
        codigo_producto: producto.codigo_producto || `PROD-${producto.id}`,
        precio_unitario: producto.precio_venta
      });
      this.calcularSubtotal(index);
    }
  }

  calcularSubtotal(index: number): void {
    const productoGroup = this.productosArray.at(index);
    const cantidad = productoGroup.get('cantidad')?.value || 0;
    const precio = productoGroup.get('precio_unitario')?.value || 0;
    const descuento = productoGroup.get('descuento_unitario')?.value || 0;

    // Validar stock
    const productoId = productoGroup.get('producto_id')?.value;
    const producto = this.productos.find(p => p.id == productoId);

    if (producto && cantidad > producto.stock) {
      Swal.fire({
        title: 'Stock insuficiente',
        text: `Solo hay ${producto.stock} unidades disponibles`,
        icon: 'warning',
        confirmButtonColor: '#dc3545'
      });
      productoGroup.patchValue({ cantidad: producto.stock });
      return;
    }

    this.calcularTotales();
  }

  calcularTotales(): void {
    let subtotalSinIgv = 0;
    let igvTotal = 0;

    this.productosArray.controls.forEach(control => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precio_unitario')?.value || 0;
      const descuento = control.get('descuento_unitario')?.value || 0;
      const tipoAfectacion = control.get('tipo_afectacion_igv')?.value || '10';

      const precioSinIgv = precio / 1.18;
      const subtotalLinea = (cantidad * precioSinIgv) - (descuento * cantidad);
      subtotalSinIgv += subtotalLinea;

      // Solo calcular IGV si es gravado (tipo 10)
      if (tipoAfectacion === '10') {
        igvTotal += subtotalLinea * 0.18;
      }
    });

    this.subtotal = subtotalSinIgv;
    this.igv = igvTotal;
    const descuentoTotal = this.ventaForm.get('descuento_total')?.value || 0;
    this.total = this.subtotal + this.igv - descuentoTotal;
  }

  getSubtotalLinea(index: number): string {
    const productoGroup = this.productosArray.at(index);
    const cantidad = productoGroup.get('cantidad')?.value || 0;
    const precio = productoGroup.get('precio_unitario')?.value || 0;
    const descuento = productoGroup.get('descuento_unitario')?.value || 0;

    const precioSinIgv = precio / 1.18;
    const subtotalLinea = (cantidad * precioSinIgv) - (descuento * cantidad);
    const igvLinea = subtotalLinea * 0.18;
    const totalLinea = subtotalLinea + igvLinea;

    return totalLinea.toFixed(2);
  }

  onSubmit(): void {
    if (this.ventaForm.valid && this.productosArray.length > 0) {
      this.isLoading = true;

      const clienteForm = this.ventaForm.get('cliente')?.value;

      // PASO 1: Registrar venta POS (NO genera comprobante automáticamente)
      const ventaData = {
        cliente_id: null, // Se enviará cliente_datos en su lugar
        productos: this.productosArray.value.map((p: any) => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          descuento_unitario: p.descuento_unitario || 0
        })),
        descuento_total: this.ventaForm.get('descuento_total')?.value || 0,
        metodo_pago: this.ventaForm.get('metodo_pago')?.value,
        observaciones: this.ventaForm.get('observaciones')?.value || null,
        // NO enviar requiere_factura - La venta queda PENDIENTE
        cliente_datos: {
          tipo_documento: clienteForm.tipo_documento,
          numero_documento: clienteForm.numero_documento,
          razon_social: clienteForm.nombre,
          direccion: clienteForm.direccion || '',
          email: clienteForm.email || '',
          telefono: clienteForm.telefono || ''
        }
      };

      this.ventasService.crearVenta(ventaData).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // Venta creada exitosamente con estado PENDIENTE
          Swal.fire({
            title: '✅ Venta Registrada',
            html: `
              <div class="text-start">
                <div class="alert alert-success mb-3">
                  <strong>Código de Venta:</strong> ${response.data.codigo_venta}<br>
                  <strong>Total:</strong> S/ ${response.data.total}<br>
                  <strong>Estado:</strong> PENDIENTE
                </div>
                <p class="mb-2">La venta ha sido registrada correctamente.</p>
                <div class="alert alert-info">
                  <strong>Próximos pasos:</strong><br>
                  1. Generar comprobante electrónico<br>
                  2. Enviar a SUNAT para validación<br>
                  3. Descargar PDF y enviar al cliente
                </div>
              </div>
            `,
            icon: 'success',
            confirmButtonText: '📋 Ver Ventas',
            showCancelButton: true,
            cancelButtonText: '➕ Nueva Venta',
            confirmButtonColor: '#198754',
            cancelButtonColor: '#0d6efd'
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/dashboard/ventas']);
            } else {
              this.resetearFormulario();
            }
          });
        },
        error: (error) => {
          this.isLoading = false;
          Swal.fire({
            title: 'Error al registrar venta',
            html: `
              <div class="text-start">
                <p class="mb-3">${error.error?.message || 'No se pudo registrar la venta. Inténtalo de nuevo.'}</p>
                ${error.error?.errors ?
                `<div class="alert alert-danger">
                    <strong>Detalles:</strong><br>
                    ${Object.values(error.error.errors).flat().join('<br>')}
                  </div>` :
                ''
              }
              </div>
            `,
            icon: 'error',
            confirmButtonColor: '#dc3545'
          });
          console.error('Error al crear venta:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos y agregue al menos un producto',
        icon: 'warning',
        confirmButtonColor: '#ffc107'
      });
    }
  }

  /**
   * Resetear formulario para nueva venta
   */
  private resetearFormulario(): void {
    this.ventaForm.reset({
      cliente: {
        tipo_documento: '1',
        numero_documento: '',
        nombre: '',
        direccion: '',
        email: '',
        telefono: ''
      },
      metodo_pago: '',
      observaciones: '',
      descuento_total: 0
    });
    this.productosArray.clear();
    this.agregarProducto();
    this.calcularTotales();
  }



  private markFormGroupTouched(): void {
    Object.keys(this.ventaForm.controls).forEach(key => {
      const control = this.ventaForm.get(key);
      control?.markAsTouched();
    });

    this.productosArray.controls.forEach(group => {
      const formGroup = group as FormGroup;
      Object.keys(formGroup.controls).forEach(key => {
        formGroup.get(key)?.markAsTouched();
      });
    });
  }

}
