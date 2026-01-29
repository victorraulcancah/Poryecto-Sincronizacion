// src\app\layouts\alt-layouts\secondheader\secondheader.component.ts
import { Component, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { Select2, Select2Data } from 'ng-select2-component';

@Component({
  selector: 'app-secondheader',
  imports: [RouterLink, FormsModule, CommonModule, ReactiveFormsModule, RouterLinkActive],
  templateUrl: './secondheader.component.html',
  styleUrl: './secondheader.component.scss'
})
export class SecondheaderComponent {
  isBrowser: boolean = false;
  selectedCategory: string = '';
  searchTerm: string = '';
  isHomePageActive: boolean = false;
  categoryDropdownVisible = false;
  isActive = false;

  
  activeIndex: any | null = null;
  windowWidth: number = 0;


  toggleSubmenu(index: string) {
    if (this.windowWidth < 992) {
      if (this.activeIndex === index) {
        this.activeIndex = null;
      } else {
        this.activeIndex = index;
      }
    }
  }

  isMobileMenuActive: boolean = false;

  openMobileMenu() {
    this.isMobileMenuActive = true;
    document.body.classList.add('scroll-hide-sm');
  }
  
  closeMobileMenu() {
    this.isMobileMenuActive = false;
    document.body.classList.remove('scroll-hide-sm');
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.isHomePageActive = this.router.url === '/' || this.router.url === '/index-two' || this.router.url === '/index-three';
    console.log(this.router.url);
  }

  onSearch() {
    console.log('Search term:', this.searchTerm);
    console.log('Selected category:', this.selectedCategory);
    // Add your search logic here
  }

  toggleCategoryDropdown() {
    this.isActive = !this.isActive;
    this.categoryDropdownVisible = !this.categoryDropdownVisible;
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-dropdown-wrapper')) {
      this.categoryDropdownVisible = false;
    }
  }

  isRouteActive(route: string): boolean {
    return this.router.url === route;
  }

  isParentActive(routes: string[]): boolean {
    const currentUrl = this.router.url;
    return routes.some(route => route !== '/' ? currentUrl.startsWith(route) : currentUrl === route);
  }
}
