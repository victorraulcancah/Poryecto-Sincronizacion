import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';



@Component({
  selector: 'app-vendor-two-details',
  imports: [CommonModule,RouterLink,BreadcrumbComponent,ShippingComponent],
  templateUrl: './vendor-two-details.component.html',
  styleUrl: './vendor-two-details.component.scss'
})
export class VendorTwoDetailsComponent {
  products = [
    {
      image: 'assets/images/thumbs/best-selling-img1.png',
      title: 'Man Fashion Shoe',
      productLink: 'product-details-two',
      blogLink: 'blog-details',
      rating: 5,
      ratingValue: 4.8,
      reviews: '12K',
      price: 25
    },
    {
      image: 'assets/images/thumbs/best-selling-img2.png',
      title: 'Woman Fashion Bag',
      productLink: 'product-details-two',
      blogLink: 'blog-details',
      rating: 5,
      ratingValue: 4.8,
      reviews: '12K',
      price: 25
    },
    {
      image: 'assets/images/thumbs/best-selling-img3.png',
      title: 'Woman Fashion Tops',
      productLink: 'product-details-two',
      blogLink: 'blog-details',
      rating: 5,
      ratingValue: 4.8,
      reviews: '12K',
      price: 25
    },
    {
      image: 'assets/images/thumbs/best-selling-img4.png',
      title: 'Woman Fashion Hat',
      productLink: 'product-details-two',
      blogLink: 'blog-details',
      rating: 5,
      ratingValue: 4.8,
      reviews: '12K',
      price: 25
    },
    {
      image: 'assets/images/thumbs/best-selling-img5.png',
      title: 'Woman Fashion',
      productLink: 'product-details-two',
      blogLink: 'blog-details',
      rating: 5,
      ratingValue: 4.8,
      reviews: '12K',
      price: 25
    },
    {
      image: 'assets/images/thumbs/best-selling-img6.png',
      title: 'Woman Fashion Bag',
      productLink: 'product-details-two',
      blogLink: 'blog-details',
      rating: 5,
      ratingValue: 4.8,
      reviews: '12K',
      price: 25
    }
  ];


  product1 = [
    {
      title: 'Instax Mini 12 Instant Film Camera - Green',
      image: 'assets/images/thumbs/trending-three-img1.png',
      discountPercentage: '-29%',
      productTag: 'HOT',
      productRating: 4.8,
      reviewCount: '12K',
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: '/product-details-two',
      blogPageLink: '/blog-details'
    },
    {
      title: "Midnight Noir Leather Jacket",
      image: "assets/images/thumbs/trending-three-img2.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      blogPageLink: "/blog-details"
    },
    {
      title: "Urban Rebel Combat Boots",
      image: "assets/images/thumbs/trending-three-img3.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      blogPageLink: "/blog-details"
    },
    {
      title: "Velvet Blossom Dress",
      image: "assets/images/thumbs/trending-three-img4.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      cartPageLink: "/cart"
    },
    {
      title: 'Instax Mini 12 Instant Film Camera - Green',
      image: 'assets/images/thumbs/trending-three-img1.png',
      discountPercentage: '-29%',
      productTag: 'HOT',
      productRating: 4.8,
      reviewCount: '12K',
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: '/product-details-two',
      blogPageLink: '/blog-details'
    },
    {
      title: "Midnight Noir Leather Jacket",
      image: "assets/images/thumbs/trending-three-img2.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      blogPageLink: "/blog-details"
    },
    {
      title: "Urban Rebel Combat Boots",
      image: "assets/images/thumbs/trending-three-img3.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      blogPageLink: "/blog-details"
    },
    {
      title: "Velvet Blossom Dress",
      image: "assets/images/thumbs/trending-three-img4.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      cartPageLink: "/cart"
    },
    {
      title: 'Instax Mini 12 Instant Film Camera - Green',
      image: 'assets/images/thumbs/trending-three-img1.png',
      discountPercentage: '-29%',
      productTag: 'HOT',
      productRating: 4.8,
      reviewCount: '12K',
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: '/product-details-two',
      blogPageLink: '/blog-details'
    },
    {
      title: "Midnight Noir Leather Jacket",
      image: "assets/images/thumbs/trending-three-img2.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      blogPageLink: "/blog-details"
    },
    {
      title: "Urban Rebel Combat Boots",
      image: "assets/images/thumbs/trending-three-img3.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      blogPageLink: "/blog-details"
    },
    {
      title: "Velvet Blossom Dress",
      image: "assets/images/thumbs/trending-three-img4.png",
      discountPercentage: "-29%",
      productTag: "HOT",
      productRating: 4.8,
      reviewCount: "12K",
      isFulfilledByMarketpro: true,
      originalPrice: 28.99,
      discountedPrice: 14.99,
      detailsPageLink: "/product-details-two",
      cartPageLink: "/cart"
    }
  ];

  
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
}
