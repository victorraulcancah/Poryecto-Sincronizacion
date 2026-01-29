// src\app\component\breadcrumb\breadcrumb.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  standalone: true, // ✅ This makes it a standalone component
  imports: [CommonModule,RouterModule], // ✅ Required for things like ngIf, ngFor
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent {
  @Input() title: string = 'Page Title';
  @Input() subtitle?: string;
}
