import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';


@Component({
  selector: 'app-vendor-details',
  imports: [RouterLink, CommonModule, BreadcrumbComponent, ShippingComponent],
  templateUrl: './vendor-details.component.html',
  styleUrl: './vendor-details.component.scss'
})
export class VendorDetailsComponent {
  products = [
    {
      title: 'C-500 Antioxidant Protect Dietary Supplement',
      store: 'Lucky Supermarket',
      image: 'assets/images/thumbs/product-img7.png',
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: '17k',
      badge: '',
      duration: 200,
      badgeClass: "",
      link: 'product-details'
    },
    {
      title: "Marcel's Modern Pantry Almond Unsweetened",
      store: 'Lucky Supermarket',
      image: 'assets/images/thumbs/product-img8.png',
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: '17k',
      badge: 'Sale 50%',
      duration: 400,
      link: 'product-details',
      badgeClass: "bg-danger-600"
    },
    {
      id: 3,
      title: "O Organics Milk, Whole, Vitamin D",
      image: "assets/images/thumbs/product-img9.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      duration: 600,
      link: 'product-details',
      badgeClass: "bg-danger-600"
    },
    {
      id: 4,
      title: "Whole Grains and Seeds Organic Bread",
      image: "assets/images/thumbs/product-img10.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      vendor: "Lucky Supermarket",
      badge: "Best Sale",
      duration: 800,
      link: 'product-details',
      badgeClass: "bg-info-600"
    },
    {
      id: 5,
      title: "Lucerne Yogurt, Lowfat, Strawberry",
      image: "assets/images/thumbs/product-img11.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      duration: 1000,
      badge: null
    },
    {
      id: 1,
      title: "C-500 Antioxidant Protect Dietary Supplement",
      image: "assets/images/thumbs/product-img13.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      vendor: "Lucky Supermarket",
      link: 'product-details',
      badge: null,
      badgeClass: ''
    },
    {
      id: 2,
      title: "C-500 Antioxidant Protect Dietary Supplement",
      image: "assets/images/thumbs/product-img14.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      badgeClass: "bg-danger-600"
    },
    {
      id: 3,
      title: "C-500 Antioxidant Protect Dietary Supplement",
      image: "assets/images/thumbs/product-img15.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "New",
      badgeClass: "bg-warning-600"
    },
    {
      id: 4,
      title: "Good & Gather Farmed Atlantic Salmon",
      image: "assets/images/thumbs/product-img16.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      badgeClass: "bg-danger-600"
    },
    {
      id: 5,
      title: "Market Pantry 41/50 Raw Tail-Off Large Raw Shrimp",
      image: "assets/images/thumbs/product-img17.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      vendor: "Lucky Supermarket",
      link: 'product-details',
      badge: "Sale 50%",
      badgeClass: "bg-danger-600"
    },
    {
      title: 'C-500 Antioxidant Protect Dietary Supplement',
      store: 'Lucky Supermarket',
      image: 'assets/images/thumbs/product-img7.png',
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: '17k',
      badge: '',
      link: 'product-details',
      duration: 200,
      badgeClass: "",
    },
    {
      title: "Marcel's Modern Pantry Almond Unsweetened",
      store: 'Lucky Supermarket',
      image: 'assets/images/thumbs/product-img8.png',
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: '17k',
      badge: 'Sale 50%',
      duration: 400,
      link: 'product-details',
      badgeClass: "bg-danger-600"
    },
    {
      id: 3,
      title: "O Organics Milk, Whole, Vitamin D",
      image: "assets/images/thumbs/product-img9.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      link: 'product-details',
      duration: 600,
      badgeClass: "bg-danger-600"
    },
    {
      id: 4,
      title: "Whole Grains and Seeds Organic Bread",
      image: "assets/images/thumbs/product-img10.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      vendor: "Lucky Supermarket",
      link: 'product-details',
      badge: "Best Sale",
      duration: 800,
      badgeClass: "bg-info-600"
    },
    {
      id: 5,
      title: "Lucerne Yogurt, Lowfat, Strawberry",
      image: "assets/images/thumbs/product-img11.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      duration: 1000,
      badge: null
    },
    {
      id: 1,
      title: "C-500 Antioxidant Protect Dietary Supplement",
      image: "assets/images/thumbs/product-img13.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: null,
      badgeClass: ''
    },
    {
      id: 2,
      title: "C-500 Antioxidant Protect Dietary Supplement",
      image: "assets/images/thumbs/product-img14.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      badgeClass: "bg-danger-600"
    },
    {
      id: 3,
      title: "C-500 Antioxidant Protect Dietary Supplement",
      image: "assets/images/thumbs/product-img15.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "New",
      badgeClass: "bg-warning-600"
    },
    {
      id: 4,
      title: "Good & Gather Farmed Atlantic Salmon",
      image: "assets/images/thumbs/product-img16.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      badgeClass: "bg-danger-600"
    },
    {
      id: 5,
      title: "Market Pantry 41/50 Raw Tail-Off Large Raw Shrimp",
      image: "assets/images/thumbs/product-img17.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      ratingCount: "17k",
      link: 'product-details',
      vendor: "Lucky Supermarket",
      badge: "Sale 50%",
      badgeClass: "bg-danger-600"
    }

  ]


  categories: { name: string; count: number; }[] = [
    { name: 'Mobile & Accessories', count: 12 },
    { name: 'Laptop', count: 12 },
    { name: 'Electronics', count: 12 },
    { name: 'Smart Watch', count: 12 },
    { name: 'Storage', count: 12 },
    { name: 'Portable Devices', count: 12 },
    { name: 'Action Camera', count: 12 },
    { name: 'Smart Gadget', count: 12 },
    { name: 'Monitor', count: 12 },
    { name: 'Smart TV', count: 12 },
    { name: 'Camera', count: 12 },
    { name: 'Monitor Stand', count: 12 },
    { name: 'Headphone', count: 12 }
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
