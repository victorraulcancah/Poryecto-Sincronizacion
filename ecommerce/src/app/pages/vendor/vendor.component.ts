import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';



@Component({
  selector: 'app-vendor',
  imports: [RouterLink, CommonModule,BreadcrumbComponent,ShippingComponent],
  templateUrl: './vendor.component.html',
  styleUrl: './vendor.component.scss'
})
export class VendorComponent {
  vendors = [
    {
      name: 'Organic Market',
      logo: 'assets/images/thumbs/vendor-logo1.png',
      delivery: 'Delivery by 6:15am',
      offer: '$5 off Snack & Candy',
      images: [
        'assets/images/thumbs/vendor-img1.png',
        'assets/images/thumbs/vendor-img2.png',
        'assets/images/thumbs/vendor-img3.png',
        'assets/images/thumbs/vendor-img4.png',
        'assets/images/thumbs/vendor-img5.png'
      ]
    },
    {
      "name": "Safeway",
      "logo": "assets/images/thumbs/vendor-logo2.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Food Max",
      "logo": "assets/images/thumbs/vendor-logo3.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "HRmart",
      "logo": "assets/images/thumbs/vendor-logo4.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Lucky Supermarket",
      "logo": "assets/images/thumbs/vendor-logo5.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Arico Farmer",
      "logo": "assets/images/thumbs/vendor-logo6.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Farmer Market",
      "logo": "assets/images/thumbs/vendor-logo7.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Foodsco",
      "logo": "assets/images/thumbs/vendor-logo8.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Organic Market",
      "logo": "assets/images/thumbs/vendor-logo1.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Safeway",
      "logo": "assets/images/thumbs/vendor-logo2.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "Food Max",
      "logo": "assets/images/thumbs/vendor-logo3.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    },
    {
      "name": "HRmart",
      "logo": "assets/images/thumbs/vendor-logo4.png",
      "delivery": "Delivery by 6:15am",
      "offer": "$5 off Snack & Candy",
      "shopLink": "shop",
      "detailsLink": "vendor-details",
      "images": [
        "assets/images/thumbs/vendor-img1.png",
        "assets/images/thumbs/vendor-img2.png",
        "assets/images/thumbs/vendor-img3.png",
        "assets/images/thumbs/vendor-img4.png",
        "assets/images/thumbs/vendor-img5.png"
      ]
    }
    // Add more vendors...
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
