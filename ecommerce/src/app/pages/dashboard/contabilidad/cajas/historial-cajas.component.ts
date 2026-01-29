import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajasService } from '../../../../services/contabilidad/cajas.service';
import { Caja, ReporteCaja } from '../../../../models/contabilidad/caja.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-historial-cajas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-cajas.component.html',
  styleUrls: ['./historial-cajas.component.scss']
})
export class HistorialCajasComponent implements OnInit {
  cajas: Caja[] = [];
  cajasConMovimientos: any[] = [];
  loading = false;
  
  // Filtros
  filtros = {
    caja_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  };
  
  constructor(private cajasService: CajasService) {}
  
  ngOnInit(): void {
    this.inicializarFechas();
    this.cargarCajas();
  }
  
  inicializarFechas(): void {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    this.filtros.fecha_inicio = hace30Dias.toISOString().split('T')[0];
    this.filtros.fecha_fin = hoy.toISOString().split('T')[0];
  }
  
  cargarCajas(): void {
    this.cajasService.listar().subscribe({
      next: (cajas) => {
        this.cajas = cajas;
        this.aplicarFiltros();
      },
      error: (error) => {
        console.error('Error al cargar cajas:', error);
        Swal.fire('Error', 'No se pudieron cargar las cajas', 'error');
      }
    });
  }
  
  aplicarFiltros(): void {
    this.loading = true;
    
    // Por ahora, mostramos solo las cajas con movimiento actual
    // En producción, deberías tener un endpoint específico para historial
    this.cajasConMovimientos = this.cajas
      .filter(caja => {
        // Filtrar por caja si se seleccionó una
        if (this.filtros.caja_id && caja.id !== +this.filtros.caja_id) {
          return false;
        }
        
        // Solo mostrar cajas que tienen o tuvieron movimientos
        return caja.movimiento_actual !== null;
      })
      .map(caja => ({
        ...caja,
        movimientos: caja.movimiento_actual ? [caja.movimiento_actual] : []
      }));
    
    this.loading = false;
  }
  
  limpiarFiltros(): void {
    this.filtros = {
      caja_id: '',
      fecha_inicio: '',
      fecha_fin: ''
    };
    this.inicializarFechas();
    this.aplicarFiltros();
  }
  
  verReporte(cajaId: number): void {
    this.cajasService.obtenerReporte(cajaId).subscribe({
      next: (reporte) => {
        this.mostrarReporte(reporte);
      },
      error: (error) => {
        console.error('Error al cargar reporte:', error);
        Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
      }
    });
  }
  
  mostrarReporte(reporte: ReporteCaja): void {
    const mov = reporte.movimiento;
    const res = reporte.resumen;
    
    let html = `
      <div class="text-start">
        <h6><strong>Caja:</strong> ${mov.caja?.nombre} (${mov.caja?.codigo})</h6>
        <p><strong>Fecha:</strong> ${mov.fecha}</p>
        <p><strong>Usuario:</strong> ${mov.user?.name}</p>
        <hr>
        <h6>Resumen Financiero</h6>
        <table class="table table-sm">
          <tr>
            <td>Monto Inicial:</td>
            <td class="text-end"><strong>S/ ${res.monto_inicial.toFixed(2)}</strong></td>
          </tr>
          <tr class="text-success">
            <td>Total Ingresos:</td>
            <td class="text-end"><strong>S/ ${res.total_ingresos.toFixed(2)}</strong></td>
          </tr>
          <tr class="text-danger">
            <td>Total Egresos:</td>
            <td class="text-end"><strong>S/ ${res.total_egresos.toFixed(2)}</strong></td>
          </tr>
          <tr class="border-top">
            <td><strong>Saldo Actual:</strong></td>
            <td class="text-end"><strong>S/ ${res.saldo_actual.toFixed(2)}</strong></td>
          </tr>
        </table>
    `;
    
    if (reporte.por_metodo_pago && reporte.por_metodo_pago.length > 0) {
      html += `
        <hr>
        <h6>Por Método de Pago</h6>
        <table class="table table-sm">
      `;
      
      reporte.por_metodo_pago.forEach(mp => {
        html += `
          <tr>
            <td>${mp.metodo_pago}</td>
            <td class="text-end">S/ ${mp.total.toFixed(2)}</td>
          </tr>
        `;
      });
      
      html += '</table>';
    }
    
    if (reporte.transacciones && reporte.transacciones.length > 0) {
      html += `
        <hr>
        <h6>Transacciones (${reporte.transacciones.length})</h6>
        <div style="max-height: 300px; overflow-y: auto;">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Categoría</th>
                <th class="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      reporte.transacciones.forEach(tx => {
        const colorClass = tx.tipo === 'INGRESO' ? 'text-success' : 'text-danger';
        html += `
          <tr>
            <td><span class="badge bg-${tx.tipo === 'INGRESO' ? 'success' : 'danger'}">${tx.tipo}</span></td>
            <td>${tx.categoria}</td>
            <td class="text-end ${colorClass}"><strong>S/ ${tx.monto.toFixed(2)}</strong></td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
    }
    
    html += '</div>';
    
    Swal.fire({
      title: 'Reporte de Caja',
      html: html,
      width: '800px',
      showCloseButton: true,
      showConfirmButton: false
    });
  }
  
  descargarPDF(cajaId: number): void {
    // Implementar descarga de PDF
    Swal.fire('Próximamente', 'La descarga de PDF estará disponible pronto', 'info');
  }
  
  descargarExcel(cajaId: number): void {
    // Implementar descarga de Excel
    Swal.fire('Próximamente', 'La descarga de Excel estará disponible pronto', 'info');
  }
}
