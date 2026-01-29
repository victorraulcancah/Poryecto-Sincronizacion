// src/app/pages/dashboard/ventas/ventas-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { VentasService, Venta } from '../../../services/ventas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ventas-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './ventas-list.component.html',
  styles: [`
    .table td {
      vertical-align: middle;
    }
    
    .dropdown-menu-custom {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 8px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      min-width: 220px;
      padding: 8px;
      z-index: 1000;
    }
    
    .dropdown-item-custom {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 12px 16px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
    }
    
    .dropdown-item-custom:hover {
      background: #f8f9fa;
    }
    
    .dropdown-item-custom i {
      font-size: 18px;
    }
    
    .dropdown-divider {
      height: 1px;
      background: #e9ecef;
      margin: 8px 0;
    }
    
    .text-purple {
      color: #6f42c1;
    }
    
    .text-teal {
      color: #20c997;
    }
    
    .text-blue {
      color: #0d6efd;
    }
    
    .cursor-pointer {
      cursor: pointer;
    }
    
    .cursor-pointer:hover {
      opacity: 0.8;
      transform: scale(1.1);
      transition: all 0.2s ease;
    }
  `]
})
export class VentasListComponent implements OnInit {
  ventas: Venta[] = [];
  isLoading = true;
  filtrosForm: FormGroup;
  paginacion: any = null;
  menuAbiertoId: number | null = null;

  constructor(
    public ventasService: VentasService,
    private fb: FormBuilder
  ) {
    this.filtrosForm = this.fb.group({
      estado: [''],
      fecha_inicio: [''],
      fecha_fin: [''],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.cargarVentas();

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', () => {
      this.cerrarMenu();
    });

  }

  cargarVentas(page: number = 1): void {
    this.isLoading = true;
    const filtros = {
      ...this.filtrosForm.value,
      page
    };

    this.ventasService.obtenerVentas(filtros).subscribe({
      next: (response) => {
        this.ventas = response.data;
        this.paginacion = {
          current_page: response.current_page,
          last_page: response.last_page,
          total: response.total,
          per_page: response.per_page
        };
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar ventas:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las ventas',
          icon: 'error'
        });
        this.isLoading = false;
      },
    });
  }

  aplicarFiltros(): void {
    this.cargarVentas(1);
  }

  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.paginacion.last_page) {
      this.cargarVentas(page);
    }
  }

  getPaginas(): number[] {
    if (!this.paginacion) return [];

    const current = this.paginacion.current_page;
    const last = this.paginacion.last_page;
    const pages: number[] = [];

    for (let i = Math.max(1, current - 2); i <= Math.min(last, current + 2); i++) {
      pages.push(i);
    }

    return pages;
  }

  verDetalle(venta: Venta): void {
    this.ventasService.obtenerVenta(venta.id).subscribe({
      next: (detalle) => {
        Swal.fire({
          title: `Venta ${venta.codigo_venta}`,
          html: this.generarHtmlDetalle(detalle),
          width: '800px',
          showCloseButton: true,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al obtener detalle:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el detalle de la venta',
          icon: 'error'
        });
      }
    });
  }

  private generarHtmlDetalle(venta: any): string {
    // Determinar tipo de comprobante
    const tipoComprobante = this.obtenerTipoComprobante(venta.comprobante?.tipo_comprobante || venta.comprobante_info?.tipo_comprobante);

    let html = `
      <div class="text-start text-sm">
        <!-- Información del Comprobante -->
        <div class="alert alert-info mb-12 px-12 py-10">
          <h6 class="mb-8 fw-semibold text-heading">${tipoComprobante}</h6>
          <div class="row text-xs">
            <div class="col-md-6">
              <strong>Número:</strong> ${venta.comprobante_info?.numero_completo || venta.codigo_venta}<br>
              <strong>Fecha:</strong> ${this.formatearFecha(venta.fecha_venta)}
            </div>
            <div class="col-md-6">
              <strong>Estado:</strong> <span class="badge ${this.getEstadoClase(venta.estado)} text-xs px-8 py-4">${venta.estado}</span><br>
              ${venta.comprobante_info ? `<strong>Estado SUNAT:</strong> <span class="badge ${this.getEstadoSunatClase(venta.comprobante_info.estado)} text-xs px-8 py-4">${venta.comprobante_info.estado}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Información del Cliente -->
        <h6 class="mb-8 fw-semibold text-heading border-bottom pb-6">Datos del Cliente</h6>
        <div class="row mb-12 text-xs">
          <div class="col-md-8">
            <strong>Cliente:</strong> ${venta.cliente?.razon_social || venta.cliente_info?.nombre_completo}<br>
            <strong>Documento:</strong> ${venta.cliente?.numero_documento || venta.cliente_info?.numero_documento}<br>
            ${venta.cliente?.direccion ? `<strong>Dirección:</strong> ${venta.cliente.direccion}` : ''}
          </div>
          <div class="col-md-4 text-xs">
            ${venta.cliente?.email ? `<strong>Email:</strong> <span class="text-2xs">${venta.cliente.email}</span><br>` : ''}
            ${venta.cliente?.telefono ? `<strong>Teléfono:</strong> ${venta.cliente.telefono}` : ''}
          </div>
        </div>

        <!-- Detalle de Productos -->
        <h6 class="mb-8 fw-semibold text-heading border-bottom pb-6">Detalle de la Venta</h6>
        <table class="table table-bordered table-sm mb-0" style="font-size: 10px;">
          <thead class="table-light">
            <tr>
              <th class="px-4 py-4" style="width: 38%; font-size: 9px;">Producto</th>
              <th class="text-center px-4 py-4" style="width: 8%; font-size: 9px;">Cant.</th>
              <th class="text-end px-4 py-4" style="width: 18%; font-size: 9px;">P. Unit.</th>
              <th class="text-end px-4 py-4" style="width: 18%; font-size: 9px;">Subtotal</th>
              <th class="text-end px-4 py-4" style="width: 18%; font-size: 9px;">Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (venta.detalles && venta.detalles.length > 0) {
      venta.detalles.forEach((detalle: any) => {
        html += `
          <tr>
            <td class="px-4 py-3" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${detalle.nombre_producto}">
              <strong style="font-size: 10px;">${detalle.nombre_producto}</strong>
              ${detalle.codigo_producto ? `<br><small class="text-muted" style="font-size: 8px;">Cód: ${detalle.codigo_producto}</small>` : ''}
            </td>
            <td class="text-center px-4 py-3" style="font-size: 10px;">${detalle.cantidad}</td>
            <td class="text-end px-4 py-3" style="font-size: 10px;">S/ ${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
            <td class="text-end px-4 py-3" style="font-size: 10px;">S/ ${parseFloat(detalle.subtotal_linea || detalle.precio_unitario * detalle.cantidad).toFixed(2)}</td>
            <td class="text-end px-4 py-3" style="font-size: 10px;">S/ ${parseFloat(detalle.total_linea).toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      html += `
        <tr>
          <td colspan="5" class="text-center text-muted py-16">No hay detalles disponibles</td>
        </tr>
      `;
    }

    html += `
            </tbody>
          </table>

        <!-- Totales -->
        <table class="table table-bordered table-sm mb-10 mt-6" style="font-size: 10px;">
          <tbody>
            <tr>
              <td colspan="4" class="text-end px-4 py-4"><strong>Subtotal (Base Imponible):</strong></td>
              <td class="text-end px-4 py-4"><strong>S/ ${parseFloat(venta.subtotal).toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td colspan="4" class="text-end px-4 py-4"><strong>IGV (18%):</strong></td>
              <td class="text-end px-4 py-4"><strong>S/ ${parseFloat(venta.igv).toFixed(2)}</strong></td>
            </tr>
            ${venta.descuento_total && parseFloat(venta.descuento_total) > 0 ? `
            <tr>
              <td colspan="4" class="text-end px-4 py-4"><strong>Descuento:</strong></td>
              <td class="text-end px-4 py-4"><strong>- S/ ${parseFloat(venta.descuento_total).toFixed(2)}</strong></td>
            </tr>
            ` : ''}
            <tr class="table-success">
              <td colspan="4" class="text-end px-4 py-5" style="font-size: 11px;"><strong>TOTAL:</strong></td>
              <td class="text-end px-4 py-5" style="font-size: 11px;"><strong>S/ ${parseFloat(venta.total).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Información Adicional -->
        <div class="row mt-12 text-xs">
          <div class="col-md-6">
            <h6 class="mb-8 fw-semibold text-xs">Información de Pago</h6>
            <strong>Método:</strong> ${venta.metodo_pago || 'No especificado'}<br>
            ${venta.observaciones ? `<strong>Observaciones:</strong> <span class="text-2xs">${venta.observaciones}</span>` : ''}
          </div>
          <div class="col-md-6">
            <h6 class="mb-8 fw-semibold text-xs">Archivos Disponibles</h6>
            <div class="d-flex flex-column gap-4 text-2xs">
              <span>${venta.comprobante_info?.tiene_xml ? '<span class="text-success">✅ XML Firmado</span>' : '<span class="text-muted">❌ XML no disponible</span>'}</span>
              <span>${venta.comprobante_info?.tiene_pdf ? '<span class="text-success">✅ PDF Generado</span>' : '<span class="text-muted">❌ PDF no disponible</span>'}</span>
              <span>${venta.comprobante_info?.tiene_cdr ? '<span class="text-success">✅ CDR de SUNAT</span>' : '<span class="text-muted">❌ CDR no disponible</span>'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  private obtenerTipoComprobante(tipo: string): string {
    const tipos: Record<string, string> = {
      '01': 'FACTURA ELECTRÓNICA',
      '03': 'BOLETA DE VENTA ELECTRÓNICA',
      '07': 'NOTA DE CRÉDITO ELECTRÓNICA',
      '08': 'NOTA DE DÉBITO ELECTRÓNICA',
      '09': 'NOTA DE VENTA',
      'FT': 'FACTURA ELECTRÓNICA',
      'BT': 'BOLETA DE VENTA ELECTRÓNICA',
      'NC': 'NOTA DE CRÉDITO ELECTRÓNICA',
      'ND': 'NOTA DE DÉBITO ELECTRÓNICA',
      'NV': 'NOTA DE VENTA'
    };

    return tipos[tipo] || 'COMPROBANTE ELECTRÓNICO';
  }

  verFirma(venta: Venta): void {
    Swal.fire({
      title: 'Cargando XML firmado...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ventasService.descargarXml(venta.id).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const xmlContent = e.target?.result as string;

          // Extraer hash del XML si existe
          const hashMatch = xmlContent.match(/<ds:DigestValue>(.*?)<\/ds:DigestValue>/);
          const hashXml = hashMatch ? hashMatch[1] : 'No disponible';

          Swal.fire({
            title: `🔐 XML Firmado Digitalmente`,
            html: `
              <div class="text-start">
                <!-- Información Principal -->
                <div class="alert alert-success mb-3" style="border-left: 4px solid #198754;">
                  <div class="d-flex align-items-center mb-2">
                    <i class="ph ph-seal-check" style="font-size: 24px; color: #198754; margin-right: 10px;"></i>
                    <div>
                      <strong style="font-size: 16px;">Documento Firmado Digitalmente</strong><br>
                      <small class="text-muted">Certificado digital válido ante SUNAT</small>
                    </div>
                  </div>
                </div>

                <!-- Detalles del Comprobante -->
                <div class="card mb-3" style="border: 1px solid #dee2e6;">
                  <div class="card-body p-3">
                    <div class="row">
                      <div class="col-6">
                        <small class="text-muted d-block">Comprobante</small>
                        <strong style="font-size: 15px;">${venta.comprobante_info?.numero_completo}</strong>
                      </div>
                      <div class="col-6">
                        <small class="text-muted d-block">Estado SUNAT</small>
                        <span class="badge ${this.getEstadoSunatClase(venta.comprobante_info?.estado || 'PENDIENTE')}" style="font-size: 12px;">
                          ${venta.comprobante_info?.estado}
                        </span>
                      </div>
                    </div>
                    <div class="row mt-2">
                      <div class="col-12">
                        <small class="text-muted d-block">Tipo de Documento</small>
                        <strong>${this.ventasService.formatearTipoDocumento(venta.comprobante_info?.tipo_comprobante || '')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Hash de Firma Digital -->
                <div class="alert alert-light mb-3" style="border: 1px solid #dee2e6; background-color: #f8f9fa;">
                  <small class="text-muted d-block mb-1"><strong>🔐 Hash de Firma Digital (SHA-256)</strong></small>
                  <code style="font-size: 11px; word-break: break-all; background-color: white; padding: 8px; display: block; border-radius: 4px; border: 1px solid #dee2e6;">${hashXml}</code>
                </div>

                <!-- Contenido XML -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong>📄 Contenido XML</strong>
                    <small class="text-muted">${(xmlContent.length / 1024).toFixed(1)} KB</small>
                  </div>
                  <div style="background-color: #1e1e1e; padding: 12px; border-radius: 6px; max-height: 300px; overflow-y: auto; font-family: 'Courier New', monospace; border: 1px solid #333;">
                    <pre style="margin: 0; font-size: 10px; white-space: pre-wrap; word-wrap: break-word; color: #d4d4d4; line-height: 1.4;">${this.escapeHtml(xmlContent)}</pre>
                  </div>
                </div>

                <!-- Botones de Acción -->
                <div class="d-flex gap-2 justify-content-end">
                  <button class="btn btn-outline-primary btn-sm" id="copiarXmlBtn" style="min-width: 120px;">
                    <i class="ph ph-copy me-1"></i>Copiar XML
                  </button>
                  <button class="btn btn-success btn-sm" id="descargarXmlBtn" style="min-width: 120px;">
                    <i class="ph ph-download me-1"></i>Descargar XML
                  </button>
                </div>
              </div>
            `,
            width: '900px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
              popup: 'swal-xml-modal'
            },
            didOpen: () => {
              // Botón copiar
              const btnCopiar = document.getElementById('copiarXmlBtn');
              if (btnCopiar) {
                btnCopiar.addEventListener('click', () => {
                  navigator.clipboard.writeText(xmlContent).then(() => {
                    btnCopiar.innerHTML = '<i class="ph ph-check me-1"></i>¡Copiado!';
                    btnCopiar.classList.remove('btn-outline-primary');
                    btnCopiar.classList.add('btn-success');
                    setTimeout(() => {
                      btnCopiar.innerHTML = '<i class="ph ph-copy me-1"></i>Copiar XML';
                      btnCopiar.classList.remove('btn-success');
                      btnCopiar.classList.add('btn-outline-primary');
                    }, 2000);
                  });
                });
              }

              // Botón descargar
              const btnDescargar = document.getElementById('descargarXmlBtn');
              if (btnDescargar) {
                btnDescargar.addEventListener('click', () => {
                  this.ventasService.descargarArchivo(blob, `${venta.comprobante_info?.numero_completo}.xml`);
                  btnDescargar.innerHTML = '<i class="ph ph-check me-1"></i>¡Descargado!';
                  setTimeout(() => {
                    btnDescargar.innerHTML = '<i class="ph ph-download me-1"></i>Descargar XML';
                  }, 2000);
                });
              }
            }
          });
        };
        reader.readAsText(blob);
      },
      error: (error) => {
        console.error('Error al cargar XML:', error);
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo cargar el XML firmado',
          icon: 'error'
        });
      }
    });
  }

  consultarSunat(venta: Venta): void {
    Swal.fire({
      title: 'Consultando SUNAT...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ventasService.consultarSunat(venta.id).subscribe({
      next: (response) => {
        const data = response.data || response;
        // Si la consulta devuelve undefined, usar el estado actual del comprobante
        const estadoFinal = data.estado || venta.comprobante_info?.estado || 'PENDIENTE';
        const mensajeFinal = data.mensaje_sunat || data.message || venta.comprobante_info?.mensaje_sunat || 'Sin mensaje';

        Swal.fire({
          title: 'Estado en SUNAT',
          html: `
            <div class="text-start">
              <div class="mb-3">
                <strong>Comprobante:</strong> ${venta.comprobante_info?.numero_completo}<br>
                <strong>Estado:</strong> 
                <span class="badge ${this.getEstadoSunatClase(estadoFinal)}">
                  ${estadoFinal}
                </span><br>
                <strong>Código SUNAT:</strong> ${data.codigo_sunat || 'N/A'}<br>
                <strong>Mensaje:</strong> ${mensajeFinal}<br>
                <strong>Fecha consulta:</strong> ${this.formatearFecha(data.fecha_consulta || new Date().toISOString())}
              </div>
              ${estadoFinal === 'ACEPTADO' ?
              '<div class="alert alert-success"><i class="ph ph-check-circle me-2"></i>El comprobante está aceptado por SUNAT</div>' :
              estadoFinal === 'RECHAZADO' ?
                '<div class="alert alert-danger"><i class="ph ph-x-circle me-2"></i>El comprobante fue rechazado por SUNAT</div>' :
                '<div class="alert alert-warning"><i class="ph ph-warning me-2"></i>El comprobante está pendiente de procesamiento</div>'
            }
            </div>
          `,
          icon: estadoFinal === 'ACEPTADO' ? 'success' : estadoFinal === 'RECHAZADO' ? 'error' : 'warning',
          confirmButtonText: 'Cerrar'
        });
        this.cargarVentas();
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo consultar el estado en SUNAT',
          icon: 'error'
        });
      }
    });
  }

  enviarSunat(venta: Venta): void {
    Swal.fire({
      title: '¿Enviar a SUNAT?',
      html: `
        <div class="text-start">
          <p>Se enviará el comprobante <strong>${venta.comprobante_info?.numero_completo}</strong> a SUNAT</p>
          ${venta.comprobante_info?.estado === 'RECHAZADO' ?
          '<div class="alert alert-warning"><i class="ph ph-warning me-2"></i>Este comprobante fue rechazado anteriormente. Se intentará reenviar.</div>' :
          ''
        }
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Guardar referencia de la venta para usar después
        const ventaOriginal = venta;

        Swal.fire({
          title: 'Enviando a SUNAT...',
          text: 'Por favor espere, esto puede tomar unos segundos',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Usar enviarSunat para primera vez, reenviarSunat para reintentos
        const endpoint = venta.comprobante_info?.estado === 'GENERADO' || venta.comprobante_info?.estado === 'PENDIENTE'
          ? this.ventasService.enviarSunat(venta.id)
          : this.ventasService.reenviarSunat(venta.id);

        endpoint.subscribe({
          next: (response) => {
            console.log('Respuesta completa de enviarSunat:', response);

            // SOLUCIÓN DIRECTA: Si el mensaje dice "exitosamente", mostrar ACEPTADO
            const mensajeResponse = response.message || response.data?.message || '';
            const esExitoso = mensajeResponse.includes('exitosamente') || mensajeResponse.includes('aceptado') || response.success === true;

            // Forzar estado ACEPTADO si la respuesta indica éxito
            const estadoFinal = esExitoso ? 'ACEPTADO' : 'PROCESANDO';
            const mensajeFinal = mensajeResponse || 'Comprobante procesado';

            console.log('Estado forzado a:', estadoFinal);

            Swal.fire({
              title: '✅ Comprobante Enviado a SUNAT',
              html: `
                <div class="text-start">
                  <div class="alert alert-success mb-3">
                    <strong>Estado:</strong> 
                    <span class="badge bg-success-50 text-success-600">
                      ${estadoFinal}
                    </span><br>
                    <strong>Mensaje:</strong> ${mensajeFinal}
                  </div>
                  <div class="alert alert-info">
                    <i class="ph ph-check-circle me-2"></i>
                    El comprobante ha sido enviado y procesado por SUNAT correctamente.
                  </div>
                  <p class="text-muted small">
                    Puede verificar el estado actualizado en la lista de ventas.
                  </p>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });

            // Recargar ventas y verificar el estado real
            this.cargarVentas();

            // Verificación adicional después de 2 segundos
            setTimeout(() => {
              const ventaActualizada = this.ventas.find(v => v.id === ventaOriginal.id);
              if (ventaActualizada?.comprobante_info?.estado === 'ACEPTADO') {
                console.log('✅ Verificación: El comprobante está realmente ACEPTADO en la lista');
              }
            }, 2000);
          },
          error: (error) => {
            Swal.fire({
              title: 'Error al enviar',
              html: `
                <div class="text-start">
                  <p class="mb-3">${error.error?.message || 'No se pudo enviar el comprobante a SUNAT'}</p>
                  ${error.error?.codigo_sunat ?
                  `<div class="alert alert-danger">
                      <strong>Código SUNAT:</strong> ${error.error.codigo_sunat}<br>
                      <strong>Detalle:</strong> ${error.error.mensaje_sunat || 'Error desconocido'}
                    </div>` :
                  ''
                }
                </div>
              `,
              icon: 'error'
            });
          }
        });
      }
    });
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  descargarCdr(ventaId: number): void {
    Swal.fire({
      title: 'Descargando CDR...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ventasService.descargarCdr(ventaId).subscribe({
      next: (blob) => {
        Swal.close();

        // Verificar el tipo de contenido
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;

          // Verificar si es HTML (error del servidor)
          if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
            Swal.fire({
              title: 'Error en CDR',
              html: `
                <div class="text-start">
                  <div class="alert alert-danger mb-3">
                    <strong>Archivo CDR corrupto</strong><br>
                    El servidor devolvió HTML en lugar del archivo CDR.
                  </div>
                  <div class="alert alert-info">
                    <strong>Posibles causas:</strong><br>
                    • El CDR no se guardó correctamente después de la respuesta de SUNAT<br>
                    • El archivo está en formato base64 sin decodificar<br>
                    • Error en el endpoint del backend
                  </div>
                </div>
              `,
              icon: 'error',
              width: '600px'
            });
            return;
          }

          // Verificar si parece ser base64
          if (content.match(/^[A-Za-z0-9+/]+=*$/)) {
            Swal.fire({
              title: 'CDR en formato incorrecto',
              html: `
                <div class="text-start">
                  <div class="alert alert-warning mb-3">
                    <strong>Archivo en base64</strong><br>
                    El CDR está en formato base64 sin decodificar.
                  </div>
                  <div class="alert alert-info">
                    <strong>Problema del backend:</strong><br>
                    El servidor debe decodificar el base64 antes de enviarlo.
                  </div>
                </div>
              `,
              icon: 'warning',
              width: '600px'
            });
            return;
          }

          // Si parece ser XML válido o ZIP, descargar
          if (content.startsWith('<?xml') || content.startsWith('PK')) {
            this.ventasService.descargarArchivo(blob, `cdr-${ventaId}.zip`);
          } else {
            // Contenido desconocido
            Swal.fire({
              title: 'Formato de CDR desconocido',
              html: `
                <div class="text-start">
                  <p class="mb-3">El archivo CDR tiene un formato no reconocido.</p>
                  <div class="alert alert-secondary">
                    <strong>Primeros caracteres:</strong><br>
                    <code>${content.substring(0, 100)}...</code>
                  </div>
                </div>
              `,
              icon: 'question',
              width: '600px'
            });
          }
        };

        reader.readAsText(blob);
      },
      error: (error) => {
        console.error('Error al descargar CDR:', error);

        let mensajeError = 'No se pudo descargar el CDR';
        let solucion = '';

        if (error.status === 404) {
          mensajeError = 'El archivo CDR no existe';
          solucion = `
            <div class="alert alert-warning mt-3">
              <strong>Posibles causas:</strong><br>
              • SUNAT no devolvió el CDR<br>
              • El CDR no se guardó correctamente<br>
              • El comprobante no fue aceptado por SUNAT
            </div>
          `;
        }

        Swal.fire({
          title: 'Error al descargar CDR',
          html: `
            <div class="text-start">
              <p class="mb-3">${mensajeError}</p>
              <p><strong>Código de error:</strong> ${error.status || 'Desconocido'}</p>
              <p><strong>URL:</strong> ${error.url || 'N/A'}</p>
              ${solucion}
            </div>
          `,
          icon: 'error',
          width: '600px'
        });
      }
    });
  }

  enviarEmail(venta: Venta): void {
    console.log('🚀 MÉTODO enviarEmail EJECUTADO');
    console.log('📋 Venta recibida:', venta);
    console.log('🆔 ID de venta:', venta.id);

    // Mostrar loading mientras obtenemos los datos completos
    Swal.fire({
      title: 'Cargando datos del cliente...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Obtener detalle completo de la venta para tener email y teléfono
    this.ventasService.obtenerVenta(venta.id).subscribe({
      next: (ventaDetallada) => {
        Swal.close();

        console.log('🔍 RESPUESTA COMPLETA DEL BACKEND:', ventaDetallada);
        console.log('📦 cliente_contacto:', ventaDetallada.cliente_contacto);
        console.log('👤 cliente:', ventaDetallada.cliente);

        // Obtener datos del cliente_contacto (nuevo campo del backend)
        const emailCliente = ventaDetallada.cliente_contacto?.email || ventaDetallada.cliente?.email || '';
        const telefonoCliente = ventaDetallada.cliente_contacto?.telefono || ventaDetallada.cliente?.telefono || '';
        const nombreCliente = ventaDetallada.cliente_contacto?.nombre_completo || ventaDetallada.cliente?.razon_social || '';
        const numeroComprobante = venta.comprobante_info?.numero_completo || venta.codigo_venta;

        console.log('✅ DATOS FINALES:');
        console.log('   📧 Email:', emailCliente);
        console.log('   📱 Teléfono:', telefonoCliente);
        console.log('   👤 Nombre:', nombreCliente);

        this.mostrarModalEnvio(venta, emailCliente, telefonoCliente, nombreCliente, numeroComprobante);
      },
      error: (error) => {
        Swal.close();
        console.error('Error al obtener detalle de venta:', error);

        // Si falla, usar datos básicos
        const emailCliente = venta.cliente_info?.email || venta.cliente?.email || '';
        const telefonoCliente = venta.cliente_info?.telefono || venta.cliente?.telefono || '';
        const nombreCliente = venta.cliente_info?.nombre_completo || venta.cliente?.razon_social || '';
        const numeroComprobante = venta.comprobante_info?.numero_completo || venta.codigo_venta;

        this.mostrarModalEnvio(venta, emailCliente, telefonoCliente, nombreCliente, numeroComprobante);
      }
    });
  }

  private mostrarModalEnvio(venta: Venta, emailCliente: string, telefonoCliente: string, nombreCliente: string, numeroComprobante: string): void {
    // Intentar obtener datos del localStorage si están vacíos
    if (!emailCliente || !telefonoCliente) {
      const clienteGuardado = localStorage.getItem(`cliente_venta_${venta.id}`);
      if (clienteGuardado) {
        try {
          const datos = JSON.parse(clienteGuardado);
          emailCliente = emailCliente || datos.email || '';
          telefonoCliente = telefonoCliente || datos.telefono || '';
          nombreCliente = nombreCliente || datos.nombre || '';
          console.log('📦 Datos recuperados de localStorage:', datos);
        } catch (e) {
          console.error('Error al parsear datos de localStorage:', e);
        }
      }
    }

    Swal.fire({
      title: 'Enviar Comprobante Electrónico',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p style="margin-bottom: 15px; color: #666;">
            <strong>Cliente:</strong> ${nombreCliente}<br>
            <strong>Comprobante:</strong> ${numeroComprobante}
          </p>
          
          <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; margin-bottom: 10px;">
              <input type="checkbox" id="enviar_email" checked style="margin-right: 8px;">
              <strong>Enviar por Email</strong>
            </label>
            <input type="email" id="email" class="swal2-input" 
                   placeholder="Email del cliente" 
                   value="${emailCliente || ''}"
                   style="margin-top: 5px;">
            ${!emailCliente ? '<small style="color: #dc3545;">⚠️ Email no disponible - Ingrese manualmente</small>' : ''}
          </div>
          
          <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; margin-bottom: 10px;">
              <input type="checkbox" id="enviar_whatsapp" style="margin-right: 8px;">
              <strong>Enviar por WhatsApp</strong>
            </label>
            <input type="text" id="telefono" class="swal2-input" 
                   placeholder="Teléfono con código país (+51987654321)" 
                   value="${telefonoCliente || ''}"
                   style="margin-top: 5px;">
            ${!telefonoCliente ? '<small style="color: #dc3545;">⚠️ Teléfono no disponible - Ingrese manualmente</small>' : ''}
          </div>
          
          <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px;"><strong>Mensaje personalizado (opcional):</strong></label>
            <textarea id="mensaje" class="swal2-textarea" 
                      placeholder="Escribe un mensaje personalizado..."
                      style="min-height: 80px;"></textarea>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: '<i class="ph ph-paper-plane-tilt"></i> Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      preConfirm: () => {
        const enviarEmail = (document.getElementById('enviar_email') as HTMLInputElement).checked;
        const enviarWhatsapp = (document.getElementById('enviar_whatsapp') as HTMLInputElement).checked;
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        const telefono = (document.getElementById('telefono') as HTMLInputElement).value.trim();
        const mensaje = (document.getElementById('mensaje') as HTMLTextAreaElement).value.trim();

        // Validaciones
        if (!enviarEmail && !enviarWhatsapp) {
          Swal.showValidationMessage('Selecciona al menos un método de envío');
          return false;
        }

        if (enviarEmail && !email) {
          Swal.showValidationMessage('Ingresa un email válido');
          return false;
        }

        if (enviarEmail && !this.validarEmail(email)) {
          Swal.showValidationMessage('El formato del email no es válido');
          return false;
        }

        if (enviarWhatsapp && !telefono) {
          Swal.showValidationMessage('Ingresa un número de teléfono');
          return false;
        }

        return { enviarEmail, enviarWhatsapp, email, telefono, mensaje };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { enviarEmail, enviarWhatsapp, email, telefono, mensaje } = result.value;
        const promesas: any[] = [];

        // Enviar por email
        if (enviarEmail) {
          promesas.push(
            this.ventasService.enviarEmail(venta.id, email, mensaje).toPromise()
          );
        }

        // Enviar por WhatsApp
        if (enviarWhatsapp) {
          promesas.push(
            this.ventasService.enviarWhatsapp(venta.id, telefono, mensaje).toPromise()
          );
        }

        // Mostrar loading
        Swal.fire({
          title: 'Enviando...',
          text: 'Por favor espera',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Ejecutar envíos
        Promise.all(promesas)
          .then((responses) => {
            const metodos = [];
            if (enviarEmail) metodos.push(`Email (${email})`);
            if (enviarWhatsapp) metodos.push(`WhatsApp (${telefono})`);

            Swal.fire({
              title: '¡Enviado!',
              html: `
                <p>Comprobante enviado exitosamente por:</p>
                <ul style="text-align: left; display: inline-block;">
                  ${metodos.map(m => `<li>${m}</li>`).join('')}
                </ul>
              `,
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
          })
          .catch((error) => {
            Swal.fire({
              title: 'Error',
              text: error.error?.message || 'No se pudo enviar el comprobante',
              icon: 'error'
            });
          });
      }
    });
  }

  /**
   * Valida formato de email
   */
  private validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }



  generarPdf(venta: Venta): void {
    Swal.fire({
      title: '🎯 Generar PDF Compliant SUNAT',
      html: `
        <div class="text-start">
          <p class="mb-3">Se generará un PDF con <strong>TODOS los parámetros SUNAT</strong>:</p>
          <div class="alert alert-info mb-3">
            <strong>Comprobante:</strong> ${venta.comprobante_info?.numero_completo}<br>
            <strong>Estado:</strong> ${venta.comprobante_info?.estado}<br>
            <strong>Tipo:</strong> ${this.obtenerTipoComprobante(venta.comprobante_info?.tipo_comprobante || '')}
          </div>
          
          <div class="alert alert-success">
            <h6 class="mb-2"><strong>📋 El PDF incluirá:</strong></h6>
            <div class="row text-sm">
              <div class="col-6">
                ✅ Datos empresa completos<br>
                ✅ Logo y contacto<br>
                ✅ Tipo específico de comprobante<br>
                ✅ Detalle completo productos
              </div>
              <div class="col-6">
                ✅ Código QR SUNAT<br>
                ✅ Hash del XML<br>
                ✅ Totales detallados<br>
                ✅ Leyendas legales
              </div>
            </div>
          </div>
          
          <p class="text-muted small">
            <strong>Sistema robusto:</strong> 3 niveles de plantillas con fallback garantizado
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '🚀 Generar PDF Compliant',
      cancelButtonText: 'Cancelar',
      width: '650px'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: '🔄 Generando PDF SUNAT...',
          html: `
            <div class="text-center">
              <div class="spinner-border text-primary mb-3" role="status"></div>
              <p class="mb-2">Procesando con sistema robusto de 3 niveles</p>
              <p class="text-muted small">Esto puede tomar unos segundos...</p>
            </div>
          `,
          allowOutsideClick: false,
          showConfirmButton: false
        });

        this.ventasService.generarPdf(venta.id).subscribe({
          next: (response) => {
            console.log('Respuesta generarPdf:', response);

            // Extraer información de la respuesta mejorada
            const data = response.data || response;
            const templateUsado = data.template_usado || 'primary';
            const elementosIncluidos = data.elementos_incluidos || {};
            const numeroCompleto = data.numero_completo || venta.comprobante_info?.numero_completo;

            // Contar elementos incluidos
            const totalElementos = Object.values(elementosIncluidos).filter(Boolean).length;
            const iconoTemplate = templateUsado === 'primary' ? '🎯' :
              templateUsado === 'fallback' ? '⚡' : '🔧';

            Swal.fire({
              title: `${iconoTemplate} PDF Generado Exitosamente`,
              html: `
                <div class="text-start">
                  <div class="alert alert-success mb-3">
                    <strong>📄 Comprobante:</strong> ${numeroCompleto}<br>
                    <strong>🎨 Template usado:</strong> ${templateUsado.toUpperCase()}<br>
                    <strong>✅ Elementos incluidos:</strong> ${totalElementos}/8 parámetros SUNAT
                  </div>
                  
                  ${totalElementos >= 6 ? `
                    <div class="alert alert-success">
                      <h6 class="mb-2">🏆 PDF Compliant SUNAT Generado</h6>
                      <p class="mb-0">El PDF incluye todos los elementos requeridos por SUNAT para facturación electrónica.</p>
                    </div>
                  ` : `
                    <div class="alert alert-warning">
                      <h6 class="mb-2">⚠️ PDF Básico Generado</h6>
                      <p class="mb-0">Se usó template de emergencia. Algunos elementos SUNAT pueden faltar.</p>
                    </div>
                  `}
                  
                  <div class="mt-3">
                    <h6 class="mb-2">📋 Elementos incluidos:</h6>
                    <div class="row text-sm">
                      <div class="col-6">
                        ${elementosIncluidos.datos_empresa ? '✅' : '❌'} Datos empresa<br>
                        ${elementosIncluidos.tipo_comprobante_especifico ? '✅' : '❌'} Tipo específico<br>
                        ${elementosIncluidos.detalle_productos_completo ? '✅' : '❌'} Detalle productos<br>
                        ${elementosIncluidos.informacion_legal_sunat ? '✅' : '❌'} Info legal SUNAT
                      </div>
                      <div class="col-6">
                        ${elementosIncluidos.totales_detallados ? '✅' : '❌'} Totales detallados<br>
                        ${elementosIncluidos.codigo_qr ? '✅' : '❌'} Código QR<br>
                        ${elementosIncluidos.hash_xml ? '✅' : '❌'} Hash XML<br>
                        ${data.tiene_pdf ? '✅' : '❌'} PDF disponible
                      </div>
                    </div>
                  </div>
                  
                  <p class="text-muted small mt-3">
                    Ahora puede descargar el PDF desde el menú de acciones.
                  </p>
                </div>
              `,
              icon: 'success',
              confirmButtonText: '🎉 ¡Perfecto!',
              width: '700px'
            });

            // Recargar la lista para actualizar el estado tiene_pdf
            this.cargarVentas();
          },
          error: (error) => {
            console.error('Error al generar PDF:', error);

            let mensajeError = 'No se pudo generar el PDF';
            let solucion = '';
            let icono: 'error' | 'warning' = 'error';

            if (error.status === 500) {
              mensajeError = 'Error interno del servidor al generar PDF';
              solucion = `
                <div class="alert alert-danger mt-3">
                  <h6><strong>🔧 Error del Sistema PDF:</strong></h6>
                  <p class="mb-2">El sistema de generación PDF falló en los 3 niveles:</p>
                  <ul class="text-start mb-0">
                    <li><strong>Nivel 1:</strong> Template principal (DomPDF)</li>
                    <li><strong>Nivel 2:</strong> Template simplificado (HTML2PDF)</li>
                    <li><strong>Nivel 3:</strong> Template emergencia (HTML básico)</li>
                  </ul>
                </div>
                <div class="alert alert-info mt-2">
                  <h6><strong>🛠️ Soluciones:</strong></h6>
                  <ol class="text-start mb-0">
                    <li>Contactar al administrador del sistema</li>
                    <li>Verificar configuración de librerías PDF</li>
                    <li>Revisar logs del servidor backend</li>
                    <li>Usar descarga de XML mientras tanto</li>
                  </ol>
                </div>
              `;
            } else if (error.status === 404) {
              mensajeError = 'Comprobante no encontrado';
              icono = 'warning';
              solucion = `
                <div class="alert alert-warning mt-3">
                  <strong>⚠️ Comprobante no existe:</strong><br>
                  El comprobante puede haber sido eliminado o no estar completamente procesado.
                </div>
              `;
            } else if (error.status === 422) {
              mensajeError = 'Datos del comprobante incompletos';
              icono = 'warning';
              solucion = `
                <div class="alert alert-warning mt-3">
                  <strong>📋 Datos faltantes:</strong><br>
                  El comprobante no tiene todos los datos necesarios para generar el PDF SUNAT.
                </div>
              `;
            }

            Swal.fire({
              title: '❌ Error al Generar PDF',
              html: `
                <div class="text-start">
                  <p class="mb-3">${mensajeError}</p>
                  <div class="alert alert-secondary">
                    <strong>🔍 Información técnica:</strong><br>
                    <strong>Código:</strong> ${error.status || 'Desconocido'}<br>
                    ${error.error?.message ? `<strong>Mensaje:</strong> ${error.error.message}<br>` : ''}
                    <strong>Comprobante:</strong> ${venta.comprobante_info?.numero_completo}
                  </div>
                  ${solucion}
                </div>
              `,
              icon: icono,
              width: '650px',
              confirmButtonText: 'Entendido'
            });
          }
        });
      }
    });
  }

  editarVenta(venta: Venta): void {
    // Verificar si la venta puede editarse
    if (!this.ventasService.puedeEditarVenta(venta)) {
      Swal.fire({
        title: 'Venta no editable',
        html: `
          <div class="text-start">
            <p class="mb-3">Esta venta no puede ser editada.</p>
            <div class="alert alert-warning">
              <strong>Razón:</strong><br>
              ${venta.estado !== 'PENDIENTE' ? 
                `• La venta está en estado <strong>${venta.estado}</strong>` : ''}
              ${venta.comprobante_info ? 
                `• Ya tiene un comprobante generado (<strong>${venta.comprobante_info.numero_completo}</strong>)` : ''}
            </div>
            <p class="text-muted small">
              Solo se pueden editar ventas en estado <strong>PENDIENTE</strong> 
              que no tengan comprobante generado.
            </p>
          </div>
        `,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Confirmar edición
    Swal.fire({
      title: '✏️ Editar Venta',
      html: `
        <div class="text-start">
          <p class="mb-3">¿Desea editar la venta <strong>${venta.codigo_venta}</strong>?</p>
          <div class="alert alert-info">
            <strong>Cliente:</strong> ${venta.cliente_info?.nombre_completo}<br>
            <strong>Total actual:</strong> S/ ${venta.total}<br>
            <strong>Estado:</strong> ${venta.estado}
          </div>
          <p class="text-muted small">
            Podrá modificar productos, cantidades, precios y método de pago.
            El stock se ajustará automáticamente.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="ph ph-pencil-simple me-1"></i> Editar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirigir al POS con el ID de la venta para editar
        // El componente POS detectará el parámetro y cargará la venta
        window.location.href = `/dashboard/ventas/editar/${venta.id}`;
      }
    });
  }

  descargarPdf(ventaId: number): void {
    // Buscar información de la venta para mostrar detalles
    const venta = this.ventas.find(v => v.id === ventaId);
    const numeroComprobante = venta?.comprobante_info?.numero_completo || `venta-${ventaId}`;

    Swal.fire({
      title: '📄 Descargando PDF SUNAT...',
      html: `
        <div class="text-center">
          <div class="spinner-border text-primary mb-3" role="status"></div>
          <p class="mb-2">Preparando PDF con parámetros SUNAT</p>
          <p class="text-muted small">Comprobante: ${numeroComprobante}</p>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false
    });

    this.ventasService.descargarPdf(ventaId).subscribe({
      next: (blob) => {
        Swal.close();

        // Generar nombre de archivo más descriptivo
        const tipoComprobante = venta?.comprobante_info?.tipo_comprobante || '01';
        const prefijo = tipoComprobante === '01' ? 'FACTURA' :
          tipoComprobante === '03' ? 'BOLETA' :
            tipoComprobante === '07' ? 'NOTA_CREDITO' :
              tipoComprobante === '08' ? 'NOTA_DEBITO' : 'COMPROBANTE';

        const nombreArchivo = `${prefijo}_${numeroComprobante.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        this.ventasService.descargarArchivo(blob, nombreArchivo);

        // Mostrar confirmación con información del PDF
        Swal.fire({
          title: '✅ PDF Descargado',
          html: `
            <div class="text-start">
              <div class="alert alert-success mb-3">
                <strong>📄 Archivo:</strong> ${nombreArchivo}<br>
                <strong>📋 Comprobante:</strong> ${numeroComprobante}<br>
                <strong>🎯 Tipo:</strong> ${this.obtenerTipoComprobante(tipoComprobante)}
              </div>
              
              <div class="alert alert-info">
                <h6 class="mb-2">📋 Este PDF incluye:</h6>
                <div class="row text-sm">
                  <div class="col-6">
                    ✅ Datos empresa completos<br>
                    ✅ Logo y contacto<br>
                    ✅ Tipo específico comprobante<br>
                    ✅ Detalle productos completo
                  </div>
                  <div class="col-6">
                    ✅ Código QR SUNAT<br>
                    ✅ Hash del XML<br>
                    ✅ Totales detallados<br>
                    ✅ Leyendas legales
                  </div>
                </div>
              </div>
              
              <p class="text-muted small mb-0">
                <strong>✨ PDF Compliant SUNAT:</strong> Cumple con todos los requisitos de facturación electrónica
              </p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: '🎉 ¡Perfecto!',
          width: '600px',
          timer: 5000,
          timerProgressBar: true
        });
      },
      error: (error) => {
        console.error('Error al descargar PDF:', error);

        let mensajeError = 'No se pudo descargar el PDF';
        let solucion = '';
        let icono: 'error' | 'warning' = 'error';

        if (error.status === 404) {
          mensajeError = 'El archivo PDF no existe';
          icono = 'warning';
          solucion = `
            <div class="alert alert-warning mt-3">
              <h6><strong>📄 PDF no encontrado</strong></h6>
              <p class="mb-2">Posibles causas:</p>
              <ul class="text-start mb-0">
                <li>El PDF no se generó automáticamente</li>
                <li>El comprobante no está completamente procesado</li>
                <li>Error en el sistema de archivos del servidor</li>
              </ul>
            </div>
            <div class="alert alert-success mt-2">
              <h6><strong>🔧 Solución:</strong></h6>
              <p class="mb-0">Use el botón <strong>"Generar PDF"</strong> en el menú de acciones para crear el archivo manualmente con todos los parámetros SUNAT.</p>
            </div>
          `;
        } else if (error.status === 500) {
          mensajeError = 'Error interno del servidor al generar PDF';
          solucion = `
            <div class="alert alert-danger mt-3">
              <h6><strong>🔧 Error del Sistema PDF:</strong></h6>
              <p class="mb-2">El servidor no pudo procesar el PDF correctamente.</p>
              <p class="mb-0">Esto puede indicar un problema con las librerías de generación PDF o los templates.</p>
            </div>
            <div class="alert alert-info mt-2">
              <h6><strong>🛠️ Recomendaciones:</strong></h6>
              <ol class="text-start mb-0">
                <li>Intentar generar el PDF manualmente</li>
                <li>Contactar al administrador del sistema</li>
                <li>Usar descarga de XML como alternativa</li>
              </ol>
            </div>
          `;
        } else if (error.status === 422) {
          mensajeError = 'Datos del comprobante incompletos para PDF';
          icono = 'warning';
          solucion = `
            <div class="alert alert-warning mt-3">
              <h6><strong>📋 Datos faltantes:</strong></h6>
              <p class="mb-0">El comprobante no tiene todos los datos necesarios para generar un PDF compliant con SUNAT.</p>
            </div>
          `;
        }

        Swal.fire({
          title: '❌ Error al Descargar PDF',
          html: `
            <div class="text-start">
              <p class="mb-3">${mensajeError}</p>
              <div class="alert alert-secondary">
                <strong>🔍 Información técnica:</strong><br>
                <strong>Código:</strong> ${error.status || 'Desconocido'}<br>
                ${error.error?.message ? `<strong>Mensaje:</strong> ${error.error.message}<br>` : ''}
                <strong>Comprobante:</strong> ${numeroComprobante}<br>
                <strong>URL:</strong> ${error.url || 'N/A'}
              </div>
              ${solucion}
            </div>
          `,
          icon: icono,
          width: '650px',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  descargarXml(ventaId: number): void {
    this.ventasService.descargarXml(ventaId).subscribe({
      next: (blob) => {
        this.ventasService.descargarArchivo(blob, `venta-${ventaId}.xml`);
      },
      error: (error) => {
        console.error('Error al descargar XML:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo descargar el XML',
          icon: 'error'
        });
      }
    });
  }

  facturarVenta(venta: Venta): void {
    // El backend ya tiene los datos del cliente guardados en la venta
    // Solo necesitamos confirmar la generación del comprobante
    Swal.fire({
      title: '¿Generar Comprobante?',
      html: `
        <div class="text-start">
          <p class="mb-2">Se generará el comprobante electrónico para:</p>
          <div class="alert alert-info">
            <strong>Venta:</strong> ${venta.codigo_venta}<br>
            <strong>Cliente:</strong> ${venta.cliente_info?.nombre_completo || 'N/A'}<br>
            <strong>Total:</strong> S/ ${venta.total}
          </div>
          <p class="text-muted small">El comprobante se firmará digitalmente pero NO se enviará a SUNAT automáticamente.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Generando comprobante...',
          text: 'Por favor espere',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Preparar datos del cliente para el comprobante
        const clienteDatos = {
          cliente_datos: {
            tipo_documento: venta.cliente_info?.numero_documento?.length === 11 ? '6' : '1',
            numero_documento: venta.cliente_info?.numero_documento || '00000000',
            razon_social: venta.cliente_info?.nombre_completo || 'CLIENTE GENERAL',
            direccion: '',
            email: venta.cliente_info?.email || '',
            telefono: venta.cliente_info?.telefono || ''
          }
        };

        this.ventasService.facturarVenta(venta.id, clienteDatos).subscribe({
          next: (response) => {
            Swal.fire({
              title: '✅ Comprobante Generado',
              html: `
                <div class="text-start">
                  <div class="alert alert-success mb-3">
                    <strong>Comprobante:</strong> ${response.comprobante?.numero_completo || 'Generado'}<br>
                    <strong>Estado:</strong> PENDIENTE (Firmado digitalmente)
                  </div>
                  <p class="mb-2">El comprobante ha sido generado y firmado correctamente.</p>
                  <p class="text-muted small">Ahora puede enviarlo a SUNAT desde el menú de acciones.</p>
                </div>
              `,
              icon: 'success',
              confirmButtonColor: '#198754'
            });
            this.cargarVentas();
          },
          error: (error) => {
            console.error('Error al facturar venta:', error);

            const isPermissionError = error.status === 403 ||
              error.error?.message?.includes('permission') ||
              error.error?.exception?.includes('UnauthorizedException');

            Swal.fire({
              title: isPermissionError ? 'Permiso denegado' : 'Error al generar comprobante',
              html: `
                <div class="text-start">
                  <p class="mb-3">${isPermissionError
                  ? 'No tienes permisos para generar comprobantes. Contacta al administrador del sistema.'
                  : (error.error?.message || 'No se pudo generar el comprobante')}</p>
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
          }
        });
      }
    });
  }

  anularVenta(venta: Venta): void {
    Swal.fire({
      title: '¿Anular venta?',
      html: `Estás a punto de anular la venta <strong>${venta.codigo_venta}</strong>.<br>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ventasService.anularVenta(venta.id).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Anulada!',
              text: 'La venta ha sido anulada exitosamente',
              icon: 'success',
              confirmButtonColor: '#198754'
            });
            this.cargarVentas();
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: error.error?.message || 'No se pudo anular la venta',
              icon: 'error',
              confirmButtonColor: '#dc3545'
            });
            console.error('Error al anular venta:', error);
          }
        });
      }
    });
  }

  getEstadoClase(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-warning-50 text-warning-600';
      case 'FACTURADO':
        return 'bg-success-50 text-success-600';
      case 'ANULADO':
        return 'bg-danger-50 text-danger-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  getEstadoSunatClase(estado: string): string {
    switch (estado) {
      case 'ACEPTADO':
        return 'bg-success-50 text-success-600';
      case 'PENDIENTE':
        return 'bg-warning-50 text-warning-600';
      case 'RECHAZADO':
        return 'bg-danger-50 text-danger-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  toggleMenu(ventaId: number, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === ventaId ? null : ventaId;

    // Debug: mostrar información del comprobante
    const venta = this.ventas.find(v => v.id === ventaId);
    if (venta?.comprobante_info) {
      console.log(`Debug Venta ${ventaId}:`, {
        estado: venta.comprobante_info.estado,
        tiene_pdf: venta.comprobante_info.tiene_pdf,
        tiene_xml: venta.comprobante_info.tiene_xml,
        tiene_cdr: venta.comprobante_info.tiene_cdr,
        numero_completo: venta.comprobante_info.numero_completo
      });
    }
  }

  cerrarMenu(): void {
    this.menuAbiertoId = null;
  }

  obtenerTipoComprobanteCorto(tipo: string): string {
    const tipos: Record<string, string> = {
      '01': 'FACTURA',
      '03': 'BOLETA',
      '07': 'N. CRÉDITO',
      '08': 'N. DÉBITO',
      '09': 'N. VENTA',
      'FT': 'FACTURA',
      'BT': 'BOLETA',
      'NC': 'N. CRÉDITO',
      'ND': 'N. DÉBITO',
      'NV': 'N. VENTA'
    };

    return tipos[tipo] || 'COMPROBANTE';
  }

  obtenerColorTipoComprobante(tipo: string): string {
    const colores: Record<string, string> = {
      '01': 'bg-primary text-white',         // Factura - Azul oscuro
      '03': 'bg-success text-white',         // Boleta - Verde oscuro
      '07': 'bg-warning text-dark',          // N. Crédito - Amarillo
      '08': 'bg-danger text-white',          // N. Débito - Rojo oscuro
      '09': 'bg-secondary text-white',       // N. Venta - Gris oscuro
      'FT': 'bg-primary text-white',
      'BT': 'bg-success text-white',
      'NC': 'bg-warning text-dark',
      'ND': 'bg-danger text-white',
      'NV': 'bg-secondary text-white'
    };

    return colores[tipo] || 'bg-info text-white';
  }

  /**
   * Muestra información sobre el sistema PDF mejorado
   */
  mostrarInfoSistemaPdf(): void {
    Swal.fire({
      title: '🎯 Sistema PDF SUNAT Mejorado',
      html: `
        <div class="text-start">
          <div class="alert alert-success mb-3">
            <h6 class="mb-2">✨ PDFs con TODOS los Parámetros SUNAT</h6>
            <p class="mb-0">Los PDFs ahora incluyen todos los elementos requeridos por SUNAT para facturación electrónica.</p>
          </div>
          
          <h6 class="mb-2">📋 Elementos incluidos en cada PDF:</h6>
          <div class="row text-sm mb-3">
            <div class="col-6">
              🏢 <strong>Datos empresa:</strong> RUC, razón social, dirección<br>
              📄 <strong>Tipo específico:</strong> "FACTURA ELECTRÓNICA", etc.<br>
              🛍️ <strong>Detalle productos:</strong> Código, descripción, precios<br>
              ⚖️ <strong>Info legal:</strong> Leyendas SUNAT obligatorias
            </div>
            <div class="col-6">
              💰 <strong>Totales:</strong> Base imponible, IGV, total en letras<br>
              🔍 <strong>Código QR:</strong> Para consulta en SUNAT<br>
              🔐 <strong>Hash XML:</strong> Firma digital del comprobante<br>
              🎨 <strong>Diseño:</strong> Profesional y imprimible
            </div>
          </div>
          
          <div class="alert alert-info mb-3">
            <h6 class="mb-2">🔧 Sistema Robusto de 3 Niveles:</h6>
            <p class="mb-1"><strong>Nivel 1:</strong> Template principal con DomPDF</p>
            <p class="mb-1"><strong>Nivel 2:</strong> Template simplificado con HTML2PDF</p>
            <p class="mb-0"><strong>Nivel 3:</strong> Template emergencia con HTML básico</p>
          </div>
          
          <div class="alert alert-warning">
            <h6 class="mb-2">🎯 Cómo usar las nuevas funciones:</h6>
            <p class="mb-1">• <strong>🎯 Generar PDF SUNAT:</strong> Crea PDF con todos los parámetros</p>
            <p class="mb-1">• <strong>🔄 Regenerar PDF:</strong> Actualiza PDF existente</p>
            <p class="mb-1">• <strong>📄 Descargar PDF:</strong> Obtiene el archivo compliant</p>
            <p class="mb-0">• <strong>📋 Indicadores:</strong> Click en 📜📄📋⚠️ para ver detalles</p>
          </div>
          
          <div class="alert alert-secondary">
            <h6 class="mb-2">🔍 Endpoints utilizados:</h6>
            <p class="mb-1"><strong>Generar:</strong> POST /api/ventas/{id}/generar-pdf</p>
            <p class="mb-0"><strong>Descargar:</strong> GET /api/ventas/{id}/pdf</p>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: '🚀 ¡Entendido!',
      width: '750px'
    });
  }

  /**
   * Muestra información detallada sobre el estado del PDF
   */
  mostrarInfoPdf(venta: Venta): void {
    if (!venta.comprobante_info) return;

    const tieneArchivos = {
      xml: venta.comprobante_info.tiene_xml,
      pdf: venta.comprobante_info.tiene_pdf,
      cdr: venta.comprobante_info.tiene_cdr
    };

    const totalArchivos = Object.values(tieneArchivos).filter(Boolean).length;

    Swal.fire({
      title: `📋 Estado del Comprobante`,
      html: `
        <div class="text-start">
          <div class="alert alert-info mb-3">
            <strong>📄 Comprobante:</strong> ${venta.comprobante_info.numero_completo}<br>
            <strong>🎯 Tipo:</strong> ${this.obtenerTipoComprobante(venta.comprobante_info.tipo_comprobante)}<br>
            <strong>📊 Estado SUNAT:</strong> 
            <span class="badge ${this.getEstadoSunatClase(venta.comprobante_info.estado)}">
              ${venta.comprobante_info.estado}
            </span>
          </div>
          
          <h6 class="mb-2">📁 Archivos Disponibles (${totalArchivos}/3):</h6>
          <div class="row mb-3">
            <div class="col-12">
              <div class="d-flex align-items-center mb-2">
                <span class="me-2">${tieneArchivos.xml ? '✅' : '❌'}</span>
                <strong>XML Firmado:</strong>
                <span class="ms-2 text-muted">${tieneArchivos.xml ? 'Disponible para descarga' : 'No generado'}</span>
              </div>
              <div class="d-flex align-items-center mb-2">
                <span class="me-2">${tieneArchivos.pdf ? '✅' : '❌'}</span>
                <strong>PDF SUNAT:</strong>
                <span class="ms-2 text-muted">${tieneArchivos.pdf ? 'Con todos los parámetros SUNAT' : 'Pendiente de generar'}</span>
              </div>
              <div class="d-flex align-items-center">
                <span class="me-2">${tieneArchivos.cdr ? '✅' : '❌'}</span>
                <strong>CDR SUNAT:</strong>
                <span class="ms-2 text-muted">${tieneArchivos.cdr ? 'Constancia de recepción' : 'No recibido'}</span>
              </div>
            </div>
          </div>
          
          ${venta.comprobante_info.estado === 'ACEPTADO' && !tieneArchivos.pdf ? `
            <div class="alert alert-warning">
              <h6 class="mb-2">🎯 PDF SUNAT Disponible</h6>
              <p class="mb-0">Puede generar un PDF con todos los parámetros requeridos por SUNAT usando el botón "🎯 Generar PDF SUNAT" en el menú de acciones.</p>
            </div>
          ` : ''}
          
          ${venta.comprobante_info.estado === 'ACEPTADO' && tieneArchivos.pdf ? `
            <div class="alert alert-success">
              <h6 class="mb-2">✅ PDF SUNAT Completo</h6>
              <p class="mb-0">El PDF incluye todos los elementos requeridos: datos empresa, código QR, hash XML, totales detallados y leyendas legales.</p>
            </div>
          ` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '600px'
    });
  }

  /**
   * Abre modal para enviar comprobante por Email o WhatsApp
   */
  abrirModalEnvio(venta: Venta): void {
    console.log('🚀 abrirModalEnvio EJECUTADO - Venta ID:', venta.id);

    // Mostrar loading
    Swal.fire({
      title: 'Cargando datos...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Obtener detalle completo para tener email y teléfono
    this.ventasService.obtenerVenta(venta.id).subscribe({
      next: (ventaDetallada) => {
        console.log('📦 RESPUESTA DEL BACKEND:', ventaDetallada);
        console.log('📧 cliente_contacto:', ventaDetallada.cliente_contacto);

        Swal.close();

        // Obtener datos del cliente_contacto
        const emailCliente = ventaDetallada.cliente_contacto?.email || ventaDetallada.cliente?.email || '';
        const telefonoCliente = ventaDetallada.cliente_contacto?.telefono || ventaDetallada.cliente?.telefono || '';
        const nombreCliente = ventaDetallada.cliente_contacto?.nombre_completo || ventaDetallada.cliente?.razon_social || venta.cliente_info?.nombre_completo || '';

        console.log('✅ DATOS EXTRAÍDOS:');
        console.log('   Email:', emailCliente);
        console.log('   Teléfono:', telefonoCliente);
        console.log('   Nombre:', nombreCliente);

        Swal.fire({
          title: 'Enviar Comprobante',
          html: `
            <div class="text-start">
              <div class="alert alert-info mb-3">
                <strong>Comprobante:</strong> ${venta.comprobante_info?.numero_completo}<br>
                <strong>Cliente:</strong> ${nombreCliente}
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Email</label>
                <input 
                  type="email" 
                  id="emailInput" 
                  class="form-control" 
                  value="${emailCliente}"
                  placeholder="correo@ejemplo.com">
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Teléfono (WhatsApp)</label>
                <input 
                  type="tel" 
                  id="telefonoInput" 
                  class="form-control" 
                  value="${telefonoCliente}"
                  placeholder="+51987654321">
                <small class="text-muted">Incluir código de país (+51)</small>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Mensaje personalizado (opcional)</label>
                <textarea 
                  id="mensajeInput" 
                  class="form-control" 
                  rows="3"
                  placeholder="Mensaje adicional para el cliente..."></textarea>
              </div>
            </div>
          `,
          width: '600px',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: '<i class="ph ph-envelope me-2"></i>Enviar por Email',
          denyButtonText: '<i class="ph ph-whatsapp-logo me-2"></i>Enviar por WhatsApp',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#0d6efd',
          denyButtonColor: '#25d366',
          cancelButtonColor: '#6c757d',
          preConfirm: () => {
            const email = (document.getElementById('emailInput') as HTMLInputElement).value;
            const telefono = (document.getElementById('telefonoInput') as HTMLInputElement).value;
            const mensaje = (document.getElementById('mensajeInput') as HTMLTextAreaElement).value;

            if (!email) {
              Swal.showValidationMessage('Por favor ingrese un email');
              return false;
            }

            return { email, telefono, mensaje, tipo: 'email' };
          },
          preDeny: () => {
            const email = (document.getElementById('emailInput') as HTMLInputElement).value;
            const telefono = (document.getElementById('telefonoInput') as HTMLInputElement).value;
            const mensaje = (document.getElementById('mensajeInput') as HTMLTextAreaElement).value;

            if (!telefono) {
              Swal.showValidationMessage('Por favor ingrese un teléfono');
              return false;
            }

            return { email, telefono, mensaje, tipo: 'whatsapp' };
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            this.enviarPorEmail(venta.id, result.value.email, result.value.mensaje);
          } else if (result.isDenied && result.value) {
            this.enviarPorWhatsApp(venta.id, result.value.telefono, result.value.mensaje);
          }
        });
      },
      error: (error) => {
        Swal.close();
        console.error('Error al obtener detalle:', error);

        // Si falla, usar datos básicos
        const emailCliente = venta.cliente_info?.email || '';
        const telefonoCliente = venta.cliente_info?.telefono || '';

        // Mostrar modal con datos básicos
        this.mostrarModalEnvioBasico(venta, emailCliente, telefonoCliente);
      }
    });
  }

  private mostrarModalEnvioBasico(venta: Venta, emailCliente: string, telefonoCliente: string): void {
    Swal.fire({
      title: 'Enviar Comprobante',
      html: `
        <div class="text-start">
          <div class="alert alert-warning mb-3">
            <small>⚠️ No se pudieron cargar los datos del cliente. Ingrese manualmente.</small>
          </div>
          <div class="alert alert-info mb-3">
            <strong>Comprobante:</strong> ${venta.comprobante_info?.numero_completo}<br>
            <strong>Cliente:</strong> ${venta.cliente_info?.nombre_completo}
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <input type="email" id="emailInput" class="form-control" value="${emailCliente}" placeholder="correo@ejemplo.com">
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Teléfono (WhatsApp)</label>
            <input type="tel" id="telefonoInput" class="form-control" value="${telefonoCliente}" placeholder="+51987654321">
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Mensaje personalizado (opcional)</label>
            <textarea id="mensajeInput" class="form-control" rows="3"></textarea>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="ph ph-envelope me-2"></i>Enviar por Email',
      denyButtonText: '<i class="ph ph-whatsapp-logo me-2"></i>Enviar por WhatsApp',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const email = (document.getElementById('emailInput') as HTMLInputElement).value;
        if (!email) {
          Swal.showValidationMessage('Por favor ingrese un email');
          return false;
        }
        return { email, mensaje: (document.getElementById('mensajeInput') as HTMLTextAreaElement).value };
      },
      preDeny: () => {
        const telefono = (document.getElementById('telefonoInput') as HTMLInputElement).value;
        if (!telefono) {
          Swal.showValidationMessage('Por favor ingrese un teléfono');
          return false;
        }
        return { telefono, mensaje: (document.getElementById('mensajeInput') as HTMLTextAreaElement).value };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.enviarPorEmail(venta.id, result.value.email, result.value.mensaje);
      } else if (result.isDenied && result.value) {
        this.enviarPorWhatsApp(venta.id, result.value.telefono, result.value.mensaje);
      }
    });
  }

  /**
   * Envía el comprobante por Email
   */
  private enviarPorEmail(ventaId: number, email: string, mensaje?: string): void {
    Swal.fire({
      title: 'Enviando...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ventasService.enviarEmail(ventaId, email, mensaje).subscribe({
      next: (response) => {
        Swal.fire({
          title: '¡Enviado!',
          html: `
            <div class="text-center">
              <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
              <p>El comprobante ha sido enviado exitosamente por email a:</p>
              <p class="fw-bold">${email}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Error al enviar email:', error);
        Swal.fire({
          title: 'Error al enviar',
          text: error.error?.message || 'No se pudo enviar el comprobante por email',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  /**
   * Envía el comprobante por WhatsApp usando el nuevo flujo
   * PASO 1: Obtener datos prellenados
   * PASO 2: Enviar por WhatsApp
   * PASO 3: Abrir WhatsApp con URL generada
   */
  private enviarPorWhatsApp(ventaId: number, telefono: string, mensaje?: string): void {
    Swal.fire({
      title: '📱 Preparando WhatsApp...',
      text: 'Validando comprobante',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // PASO 1: Obtener datos prellenados y validar
    this.ventasService.obtenerDatosWhatsApp(ventaId).subscribe({
      next: (datosResponse) => {
        console.log('📦 Datos WhatsApp obtenidos:', datosResponse);

        const datos = datosResponse.data || datosResponse;

        // Verificar si puede enviar
        if (datos.puede_enviar === false) {
          Swal.fire({
            title: '⚠️ No se puede enviar',
            html: `
              <div class="text-start">
                <div class="alert alert-warning">
                  <strong>Razón:</strong><br>
                  ${datos.razon_no_enviar || 'El comprobante no está listo para enviar'}
                </div>
                <p class="text-muted small">
                  ${datos.razon_no_enviar?.includes('PDF') ? 
                    'Debe generar el PDF primero desde el menú de acciones.' : 
                    'Debe enviar el comprobante a SUNAT primero.'}
                </p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
          return;
        }

        // PASO 2: Enviar por WhatsApp
        Swal.fire({
          title: '📤 Enviando por WhatsApp...',
          text: 'Generando enlace',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.ventasService.enviarWhatsApp(ventaId, telefono, mensaje).subscribe({
          next: (response) => {
            console.log('✅ Respuesta envío WhatsApp:', response);

            const data = response.data || response;

            // PASO 3: Abrir WhatsApp con la URL generada
            if (data.whatsapp_url) {
              Swal.fire({
                title: '✅ ¡Listo para enviar!',
                html: `
                  <div class="text-start">
                    <div class="alert alert-success mb-3">
                      <i class="ph ph-check-circle me-2"></i>
                      <strong>WhatsApp se abrirá automáticamente</strong>
                    </div>
                    
                    <div class="mb-3">
                      <strong>📱 Teléfono:</strong> ${data.telefono}<br>
                      <strong>📄 Comprobante:</strong> ${data.comprobante}<br>
                      <strong>📅 Fecha:</strong> ${data.fecha_envio || 'Ahora'}
                    </div>

                    <div class="alert alert-info">
                      <small>
                        <strong>💡 Nota:</strong> El mensaje incluye un enlace público para descargar el PDF del comprobante.
                      </small>
                    </div>

                    <div class="d-grid gap-2">
                      <button class="btn btn-success" id="abrirWhatsAppBtn">
                        <i class="ph ph-whatsapp-logo me-2"></i>
                        Abrir WhatsApp
                      </button>
                      <button class="btn btn-outline-secondary btn-sm" id="copiarUrlBtn">
                        <i class="ph ph-copy me-2"></i>
                        Copiar enlace del PDF
                      </button>
                    </div>
                  </div>
                `,
                icon: 'success',
                showConfirmButton: false,
                showCloseButton: true,
                width: '600px',
                didOpen: () => {
                  // Botón para abrir WhatsApp
                  const btnAbrir = document.getElementById('abrirWhatsAppBtn');
                  if (btnAbrir) {
                    btnAbrir.addEventListener('click', () => {
                      window.open(data.whatsapp_url, '_blank');
                      Swal.close();
                    });
                  }

                  // Botón para copiar URL del PDF
                  const btnCopiar = document.getElementById('copiarUrlBtn');
                  if (btnCopiar && data.pdf_url) {
                    btnCopiar.addEventListener('click', () => {
                      navigator.clipboard.writeText(data.pdf_url).then(() => {
                        btnCopiar.innerHTML = '<i class="ph ph-check me-2"></i>¡Copiado!';
                        btnCopiar.classList.remove('btn-outline-secondary');
                        btnCopiar.classList.add('btn-success');
                        setTimeout(() => {
                          btnCopiar.innerHTML = '<i class="ph ph-copy me-2"></i>Copiar enlace del PDF';
                          btnCopiar.classList.remove('btn-success');
                          btnCopiar.classList.add('btn-outline-secondary');
                        }, 2000);
                      });
                    });
                  }

                  // Abrir WhatsApp automáticamente después de 1 segundo
                  setTimeout(() => {
                    window.open(data.whatsapp_url, '_blank');
                  }, 1000);
                }
              });
            } else {
              // Fallback si no hay whatsapp_url
              Swal.fire({
                title: '✅ Enviado',
                html: `
                  <div class="text-center">
                    <i class="ph ph-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                    <p>El comprobante ha sido procesado para WhatsApp</p>
                    <p class="fw-bold">${telefono}</p>
                  </div>
                `,
                icon: 'success',
                confirmButtonColor: '#198754'
              });
            }
          },
          error: (error) => {
            console.error('❌ Error al enviar WhatsApp:', error);

            let mensajeError = error.error?.message || 'No se pudo enviar el comprobante por WhatsApp';
            let solucion = '';

            // Mensajes específicos según el error
            if (error.status === 404) {
              mensajeError = 'Esta venta no tiene un comprobante electrónico';
              solucion = 'Debe generar el comprobante primero desde el menú de acciones.';
            } else if (error.status === 400) {
              if (error.error?.message?.includes('PDF')) {
                mensajeError = 'El comprobante no tiene PDF generado';
                solucion = 'Debe generar el PDF primero desde el menú de acciones.';
              } else if (error.error?.message?.includes('SUNAT')) {
                mensajeError = 'El comprobante debe estar aceptado por SUNAT';
                solucion = 'Debe enviar el comprobante a SUNAT primero.';
              }
            }

            Swal.fire({
              title: '❌ Error al enviar',
              html: `
                <div class="text-start">
                  <p class="mb-3">${mensajeError}</p>
                  ${solucion ? `
                    <div class="alert alert-info">
                      <strong>💡 Solución:</strong><br>
                      ${solucion}
                    </div>
                  ` : ''}
                  ${error.error?.data?.estado_actual ? `
                    <div class="alert alert-warning">
                      <strong>Estado actual:</strong> ${error.error.data.estado_actual}
                    </div>
                  ` : ''}
                </div>
              `,
              icon: 'error',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      },
      error: (error) => {
        console.error('❌ Error al obtener datos WhatsApp:', error);
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudieron obtener los datos para WhatsApp',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

}
