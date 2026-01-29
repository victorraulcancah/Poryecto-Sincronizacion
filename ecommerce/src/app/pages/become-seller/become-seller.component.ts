import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';




@Component({
  selector: 'app-become-seller',
  imports: [CommonModule, RouterLink, SlickCarouselModule, BreadcrumbComponent, ShippingComponent],
  templateUrl: './become-seller.component.html',
  styleUrl: './become-seller.component.scss'
})
export class BecomeSellerComponent {
  // instagram slider
  instagramImages = [
    { src: 'assets/images/thumbs/instagram-img1.png', delay: 400 },
    { src: 'assets/images/thumbs/instagram-img2.png', delay: 600 },
    { src: 'assets/images/thumbs/instagram-img3.png', delay: 800 },
    { src: 'assets/images/thumbs/instagram-img4.png', delay: 1000 },
    { src: 'assets/images/thumbs/instagram-img2.png', delay: 1200 }
  ];
  instagramSlider =
    {
      slidesToShow: 4,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 2000,
      speed: 1500,
      dots: false,
      pauseOnHover: true,
      arrows: true,
      draggable: true,
      infinite: true,
      nextArrow: '#instagram-next',
      prevArrow: '#instagram-prev',
      responsive: [
        {
          breakpoint: 1299,
          settings: {
            slidesToShow: 3,
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
          breakpoint: 768,
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
