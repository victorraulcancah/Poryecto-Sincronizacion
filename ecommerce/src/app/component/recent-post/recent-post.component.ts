import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-recent-post',
  imports: [CommonModule, RouterModule],
  templateUrl: './recent-post.component.html',
  styleUrl: './recent-post.component.scss'
})
export class RecentPostComponent {
  posts = [
    { title: 'Once determined you need to come up with a name', image: 'assets/images/thumbs/recent-post1.png', date: 'July 12, 2025' },
    { title: 'Another post title goes here', image: 'assets/images/thumbs/recent-post2.png', date: 'July 13, 2025' },
    { title: 'Interesting article title here', image: 'assets/images/thumbs/recent-post3.png', date: 'July 14, 2025' },
    { title: 'Useful info in this blog post', image: 'assets/images/thumbs/recent-post4.png', date: 'July 15, 2025' }
  ];
}
