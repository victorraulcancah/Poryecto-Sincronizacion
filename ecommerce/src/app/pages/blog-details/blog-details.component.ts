import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../component/breadcrumb/breadcrumb.component';
import { ShippingComponent } from '../../component/shipping/shipping.component';
import { RecentPostComponent } from '../../component/recent-post/recent-post.component';
import { BlogCategoryListComponent } from '../../component/blog-category-list/blog-category-list.component';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-blog-details',
  imports: [RouterLink,CommonModule, BreadcrumbComponent,ShippingComponent,RecentPostComponent,BlogCategoryListComponent],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss'
})
export class BlogDetailsComponent {
  comments = [
    {
      name: 'Marvin McKinney',
      date: '26 Apr, 2024',
      avatar: 'assets/images/thumbs/comment-img1.png',
      message: 'In a nisi commodo, porttitor ligula consequat, tincidunt dui. Nulla volutpat, metus eu aliquam malesuada, elit libero venenatis urna, consequat maximus arcu diam non diam.'
    },
    {
      name: 'Kristin Watson',
      date: '24 Apr, 2024',
      avatar: 'assets/images/thumbs/comment-img2.png',
      message: 'Quisque eget tortor lobortis, facilisis metus eu, elementum est. Nunc sit amet erat quis ex convallis suscipit. Nam hendrerit, velit ut aliquam euismod, nibh tortor rutrum nisi, ac sodales nunc eros porta nisi. Sed scelerisque, est eget aliquam venenatis, est sem tempor eros.'
    },
    {
      name: 'Jenny Wilson',
      date: '20 Apr, 2024',
      avatar: 'assets/images/thumbs/comment-img3.png',
      message: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.'
    },
    {
      name: 'Robert Fox',
      date: '18 Apr, 2024',
      avatar: 'assets/images/thumbs/comment-img4.png',
      message: 'Pellentesque feugiat, nibh vel vehicula pretium, nibh nibh bibendum elit, a volutpat arcu dui nec orci. Aenean dui odio, ullamcorper quis turpis ac, volutpat imperdiet ex.'
    },
    {
      name: 'Eleanor Pena',
      date: '7 Apr, 2024',
      avatar: 'assets/images/thumbs/comment-img5.png',
      message: 'Nulla molestie interdum ultricies.'
    }
  ];
}
