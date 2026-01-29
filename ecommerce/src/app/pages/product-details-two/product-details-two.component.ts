import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ Import this
import { RouterLink } from '@angular/router';
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';



@Component({
  selector: 'app-product-details-two',
  imports: [CommonModule,RouterLink,SlickCarouselModule,BreadcrumbComponent,ShippingComponent],
  templateUrl: './product-details-two.component.html',
  styleUrl: './product-details-two.component.scss'
})
export class ProductDetailsTwoComponent {
  productThumbSlider = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: true,
    asNavFor: '.product-details__images-slider'
  };

  productImageSlider = {
    slidesToShow: 4,
    slidesToScroll: 1,
    asNavFor: '.product-details__thumb-slider',
    dots: false,
    arrows: false,
    focusOnSelect: true
  };
  thumbs = [
    "assets/images/thumbs/product-details-two-thumb1.png",
    'assets/images/thumbs/product-details-two-thumb2.png',
    'assets/images/thumbs/product-details-two-thumb3.png',
    'assets/images/thumbs/product-details-two-thumb1.png',
    'assets/images/thumbs/product-details-two-thumb2.png',
    
  ];
  images = [
    "assets/images/thumbs/product-details-two-thumb1.png",
    'assets/images/thumbs/product-details-two-thumb2.png',
    'assets/images/thumbs/product-details-two-thumb3.png',
    'assets/images/thumbs/product-details-two-thumb1.png',
    'assets/images/thumbs/product-details-two-thumb2.png',
  ];

  products = [
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img26.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 200,
      total: 35
    },
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img27.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 400,
      total: 35
    },
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img28.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 600,
      total: 35
    },
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img29.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 800,
      total: 35
    },
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img30.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 800,
      total: 35
    },
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img13.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 800,
      total: 35
    },
    {
      name: "Hortalizas en floretes de brócoli de Taylor Farms",
      image: "assets/images/thumbs/product-img3.png",
      price: 14.99,
      oldPrice: 28.99,
      rating: 4.8,
      reviews: "17k",
      sold: 18,
      fadeDuration: 800,
      total: 35
    },
  ];

  arrivalSlider = {
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    infinite: true,
    nextArrow: '#new-arrival-next',
    prevArrow: '#new-arrival-prev',
    responsive: [
      {
        breakpoint: 1599,
        settings: {
          slidesToShow: 6,
          arrows: false,
        }
      },
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 4,
          arrows: false,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 424,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  }
}
