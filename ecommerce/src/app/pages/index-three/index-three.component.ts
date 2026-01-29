import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ Import this
import { NgFor } from '@angular/common'; // (Optional: For tree-shaking optimization)
// Import your library
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-index-three',
  imports: [CommonModule, SlickCarouselModule, RouterLink],
  templateUrl: './index-three.component.html',
  styleUrl: './index-three.component.scss'
})
export class IndexThreeComponent {
  // banner image 

  banners = [
    {
      img: 'assets/images/thumbs/banner-three-img1.png',
      subtitle: 'UP TO 50% OFF',
      title: 'New <span class="fw-normal text-main-two-600 font-heading-four">Style</span> Just For You.',
      description: 'You appear ordinary if you dress simply. We are able to help you.',
      route: ['shop']
    },
    {
      img: 'assets/images/thumbs/banner-three-img2.png',
      subtitle: 'UP TO 50% OFF',
      title: 'New <span class="fw-normal text-main-two-600 font-heading-four">Style</span> Just For You.',
      description: 'You appear ordinary if you dress simply. We are able to help you.',
      route: ['shop']
    },
    {
      img: 'assets/images/thumbs/banner-three-img3.png',
      subtitle: 'UP TO 50% OFF',
      title: 'New <span class="fw-normal text-main-two-600 font-heading-four">Style</span> Just For You.',
      description: 'You appear ordinary if you dress simply. We are able to help you.',
      route: ['shop']
    }
  ];

  bannerSlider = {
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: true,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 3000,
    infinite: true,
    speed: 500
  };


  // Popular slider 
  features = [
    {
      img: 'assets/images/thumbs/features-three-img1.png',
      title: "Men's Fashion",
      items: '180 Items',
      bgClass: 'bg-yellow-light'
    },
    {
      img: 'assets/images/thumbs/features-three-img2.png',
      title: "Women's Fashion",
      items: '220 Items',
      bgClass: 'bg-danger-light'
    },
    {
      img: 'assets/images/thumbs/features-three-img3.png',
      title: 'Kid’s Fashion',
      items: '205 Items',
      bgClass: 'bg-purple-light'
    },
    {
      img: 'assets/images/thumbs/features-three-img4.png',
      title: 'Fashion Glass',
      items: '68 Items',
      bgClass: 'bg-danger-light'
    },
    {
      img: 'assets/images/thumbs/features-three-img5.png',
      title: 'Shoes Collection',
      items: '190 Items',
      bgClass: 'bg-warning-light'
    },
    {
      img: 'assets/images/thumbs/features-three-img6.png',
      title: 'Bag Collection',
      items: '128 Items',
      bgClass: 'bg-success-light'
    },
    {
      img: 'assets/images/thumbs/features-three-img3.png',
      title: "Men's Fashion",
      items: '180 Items',
      bgClass: ''
    }
  ];

  popularSlideConfig = {
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    infinite: true,
    nextArrow: '#feature-item-wrapper-next',
    prevArrow: '#feature-item-wrapper-prev',
    responsive: [
      {
        breakpoint: 1599,
        settings: {
          slidesToShow: 5,
        }
      },
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 4,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 424,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 359,
        settings: {
          slidesToShow: 1,
        }
      },
    ]
  }

  // offer
  offers: string[] = [
    'T-Shirt Offer',
    'Best Selling Offer',
    'Limited Offer Sales',
    'Spring Collection',
    'Hot Deal Products',
    'Our Services',
    // Repeat again if you want smoother loop illusion
    'T-Shirt Offer',
    'Best Selling Offer',
    'Limited Offer Sales',
  ];
  repeatedOffers = [...this.offers, ...this.offers, ...this.offers];

  // brand slider 
  brandImages = [
    'assets/images/thumbs/brand-three-img1.png',
    'assets/images/thumbs/brand-three-img2.png',
    'assets/images/thumbs/brand-three-img3.png',
    'assets/images/thumbs/brand-three-img4.png',
    'assets/images/thumbs/brand-three-img5.png',
    'assets/images/thumbs/brand-three-img6.png',
    'assets/images/thumbs/brand-three-img7.png',
    'assets/images/thumbs/brand-three-img8.png',
    'assets/images/thumbs/brand-three-img5.png'
  ];
  BrandSlideConfig = {
    slidesToShow: 8,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    infinite: true,
    nextArrow: '#brand-next',
    prevArrow: '#brand-prev',
    responsive: [
      {
        breakpoint: 1599,
        settings: {
          slidesToShow: 7,
          arrows: false,
        }
      },
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 6,
          arrows: false,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 5,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 4,
          arrows: false,
        }
      },
      {
        breakpoint: 424,
        settings: {
          slidesToShow: 3,
          arrows: false,
        }
      },
      {
        breakpoint: 359,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
    ]
  };

  testimonialSlider = {
    slidesToShow: 1,
    slidesToScroll: 1,
    asNavFor: '.testimonials-thumbs-slider',
    dots: true,
    centerMode: true,
    focusOnSelect: true,
    fade: true,
    cssEase: 'linear',
    arrows: false,
  }

  testmonialThumbSlider = {
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    infinite: true,
    nextArrow: '#testi-next',
    prevArrow: '#testi-prev',
    asNavFor: '.testimonials-slider',
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
          slidesToShow: 2,
          arrows: false,
        }
      },
    ]
  }
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



  products = [
    {
      id: 1,
      name: "Instax Mini 12 Instant Film Camera - Green",
      image: "assets/images/thumbs/trending-three-img1.png",
      oldPrice: 28.99,
      newPrice: 14.99,
      rating: 4.8,
      reviews: "12K",
      discount: "-29%",
      tag: "HOT",
      fulfilledBy: "Marketpro",
      fadeDuration: 200
    },
    {
      id: 2,
      name: "Midnight Noir Leather Jacket",
      image: "assets/images/thumbs/trending-three-img2.png",
      oldPrice: 28.99,
      newPrice: 14.99,
      rating: 4.8,
      reviews: "12K",
      discount: "-29%",
      tag: "HOT",
      fulfilledBy: "Marketpro",
      fadeDuration: 400
    },
    {
      id: 3,
      name: "Urban Rebel Combat Boots",
      image: "assets/images/thumbs/trending-three-img3.png",
      oldPrice: 28.99,
      newPrice: 14.99,
      rating: 4.8,
      reviews: "12K",
      discount: "-29%",
      tag: "HOT",
      fulfilledBy: "Marketpro",
      fadeDuration: 600
    },
    {
      id: 4,
      name: "Velvet Blossom Dress",
      image: "assets/images/thumbs/trending-three-img4.png",
      oldPrice: 28.99,
      newPrice: 14.99,
      rating: 4.8,
      reviews: "12K",
      discount: "-29%",
      tag: "HOT",
      fulfilledBy: "Marketpro",
      fadeDuration: 800
    },

  ]

  productList = [
    {
      id: 1,
      title: 'Instax Mini 12 Instant Film Camera - Green',
      image: 'assets/images/thumbs/trending-three-img1.png',
      isHot: true,
      discount: 29,
      rating: 4.8,
      reviews: '12K',
      fulfilledBy: 'Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      badge: 'HOT',
      routerLink: 'product-details-two'
    },
    {
      id: 2,
      title: 'Velvet Blossom Dress',
      image: 'assets/images/thumbs/trending-three-img2.png',
      discount: 29,
      isHot: true,
      rating: 4.8,
      reviews: '12K',
      fulfilledBy: 'Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      routerLink: 'product-details-two'
    },
    {
      id: 3,
      title: 'Midnight Noir Leather Jacket',
      image: 'assets/images/thumbs/trending-three-img3.png',
      discount: 29,
      isHot: true,
      rating: 4.8,
      reviews: '12K',
      fulfilledBy: 'Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      routerLink: 'product-details-two'
    }
  ];

  productpopular = [
    {
      imageUrl: 'assets/images/thumbs/trending-three-img7.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 400
    },
    {
      imageUrl: 'assets/images/thumbs/trending-three-img3.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 600
    },
    {
      imageUrl: 'assets/images/thumbs/trending-three-img8.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 800
    },
    {
      imageUrl: 'assets/images/thumbs/trending-three-img9.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 1000
    },
    {
      imageUrl: 'assets/images/thumbs/trending-three-img3.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 400
    },

    {
      imageUrl: 'assets/images/thumbs/trending-three-img5.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 600
    },
    {
      imageUrl: 'assets/images/thumbs/trending-three-img10.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 800
    },
    {
      imageUrl: 'assets/images/thumbs/trending-three-img6.png',
      discount: '-29%',
      hotLabel: 'HOT',
      productLink: 'product-details-two',
      productName: 'Instax Mini 12 Instant Film Camera - Green',
      rating: 4.8,
      reviewCount: 12000,
      fulfillment: 'Fulfilled by Marketpro',
      oldPrice: 28.99,
      newPrice: 14.99,
      cartLink: 'cart',
      fadeDuration: 1000
    },
  ]
}
