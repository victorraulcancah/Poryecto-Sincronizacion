// src/app/pages/sobre-nosotros/sobre-nosotros.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { EmpresaInfoService } from '../../services/empresa-info.service';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, ShippingComponent],
  templateUrl: './sobre-nosotros.component.html',
  styleUrl: './sobre-nosotros.component.scss',
})
export class SobreNosotrosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  nombreEmpresa = '';
  sobreNosotros = '';
  isLoading = true;

  constructor(private empresaInfoService: EmpresaInfoService) {}

  ngOnInit(): void {
    this.empresaInfoService.empresaInfoPublica$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (!data) return;
        this.nombreEmpresa = data.nombre_empresa || '';
        this.sobreNosotros = data.sobre_nosotros || '';
        this.isLoading = false;
      });

    this.empresaInfoService.refreshPublicInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
