import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';



@Component({
  selector: 'app-vendor-two',
  standalone: true,
  imports: [CommonModule, RouterLink,BreadcrumbComponent,ShippingComponent],
  templateUrl: './vendor-two.component.html',
  styleUrls: ['./vendor-two.component.scss']
})
export class VendorTwoComponent {
  email: string = 'info@watch.com';

  // JSON category data declared properly
  categories = [
    { name: 'Mobile & Accessories', count: 12, route: 'product-details-two' },
    { name: 'Laptop', count: 12, route: 'product-details-two' },
    { name: 'Electronics', count: 12, route: 'product-details-two' },
    { name: 'Smart Watch', count: 12, route: 'product-details-two' },
    { name: 'Storage', count: 12, route: 'product-details-two' },
    { name: 'Portable Devices', count: 12, route: 'product-details-two' },
    { name: 'Action Camera', count: 12, route: 'product-details-two' },
    { name: 'Smart Gadget', count: 12, route: 'product-details-two' },
    { name: 'Monitor', count: 12, route: 'product-details-two' },
    { name: 'Smart TV', count: 12, route: 'product-details-two' },
    { name: 'Camera', count: 12, route: 'product-details-two' },
    { name: 'Monitor Stand', count: 12, route: 'product-details-two' },
    { name: 'Headphone', count: 12, route: 'product-details-two' }
  ];



  vendors = [
    {
      storeName: 'e-Mart Shop',
      rating: 4.8,
      reviewCount: '12K',
      image: 'assets/images/thumbs/vendors-two-img1.png',
      logo: 'assets/images/thumbs/vendors-two-icon1.png',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      routerLink: 'vendor-two-details'
    },
    {
      storeName: 'Baishakhi',
      rating: 4.8,
      reviewCount: '12K',
      image: 'assets/images/thumbs/vendors-two-img2.png',
      logo: 'assets/images/thumbs/vendors-two-icon2.png',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      routerLink: 'vendor-two-details'
    },
    {
      storeName: 'e-zone Shop',
      rating: 4.8,
      reviewCount: '12K',
      image: 'assets/images/thumbs/vendors-two-img3.png',
      logo: 'assets/images/thumbs/vendors-two-icon3.png',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      routerLink: 'vendor-two-details'
    },
    {
      storeName: 'Cloth & Fashion Shop',
      rating: 4.8,
      reviewCount: '12K',
      image: 'assets/images/thumbs/vendors-two-img4.png',
      logo: 'assets/images/thumbs/vendors-two-icon1.png',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      routerLink: 'vendor-two-details'
    },
    {
      storeName: 'New Market Shop',
      rating: 4.8,
      reviewCount: '12K',
      image: 'assets/images/thumbs/vendors-two-img5.png',
      logo: 'assets/images/thumbs/vendors-two-icon5.png',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      routerLink: 'vendor-two-details'
    },
    {
      storeName: 'Zeilla Shop',
      rating: 4.8,
      reviewCount: '12K',
      image: 'assets/images/thumbs/vendors-two-img6.png',
      logo: 'assets/images/thumbs/vendors-two-icon6.png',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      routerLink: 'vendor-two-details'
    },
    {
      storeName: 'Ever Green Shop',
      image: 'assets/images/thumbs/vendors-two-img7.png',
      logo: 'assets/images/thumbs/vendors-two-icon7.png',
      rating: 4.8,
      reviewCount: '12K',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      storeLink: 'vendor-two-details'
    },
    {
      storeName: 'Maple Shop',
      image: 'assets/images/thumbs/vendors-two-img8.png',
      logo: 'assets/images/thumbs/vendors-two-icon8.png',
      rating: 5,
      reviewCount: '12K',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      storeLink: 'vendor-two-details'
    },
    {
      storeName: 'New Mart',
      image: 'assets/images/thumbs/vendors-two-img9.png',
      logo: 'assets/images/thumbs/vendors-two-icon2.png',
      rating: 5,
      reviewCount: '12K',
      address: '6391 Elgin St. Celina, Delaware 10299',
      email: 'info@watch.com',
      phone: '083 308 1888',
      storeLink: 'vendor-two-details'
    }
   
  ];
  

  // pagination 
  totalPages = 7; // Total number of pages
  currentPage = 1; // The currently active page

  // Method to generate page numbers based on totalPages
  getPages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Method to handle page change
  onPageChange(page: number) {
    this.currentPage = page;
  }


  
}
