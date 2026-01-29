import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog-category-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-category-list.component.html',
  styleUrl: './blog-category-list.component.scss'
})
export class BlogCategoryListComponent {
  categories = [
    { name: 'Gaming', count: 12 },
    { name: 'Smart Gadget', count: 5 },
    { name: 'Software', count: 29 },
    { name: 'Electronics', count: 24 },
    { name: 'Laptop', count: 8 },
    { name: 'Mobile & Accessories', count: 16 },
    { name: 'Apliance', count: 24 }
  ];
}
