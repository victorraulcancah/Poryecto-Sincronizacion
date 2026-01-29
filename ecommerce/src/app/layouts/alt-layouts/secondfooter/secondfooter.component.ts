import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-secondfooter',
  imports: [RouterLink, CommonModule],
  templateUrl: './secondfooter.component.html',
  styleUrl: './secondfooter.component.scss'
})
export class SecondfooterComponent {
  footerSections = [
    {
      title: 'About us',
      links: [
        { label: 'Company Profile', route: ['shop'] },
        { label: 'All Retail Store', route: ['shop'] },
        { label: 'Merchant Center', route: ['shop'] },
        { label: 'Affiliate', route: ['shop'] },
        { label: 'Contact Us', route: ['shop'] },
        { label: 'Feedback', route: ['shop'] },
        { label: 'Huawei Group', route: ['shop'] },
        { label: 'Rules & Policy', route: ['shop'] },
      ]
    },

    {
      title: 'Customer Support',
      links: [
        { label: 'Help Center', route: ['help'] },
        { label: 'Contact Us', route: ['contact'] },
        { label: 'Gift Card', route: ['contact'] },
        { label: 'Report Abuse', route: ['report-abuse'] },
        { label: 'Submit and Dispute', route: ['dispute'] },
        { label: 'Policies & Rules', route: ['policies'] },
        { label: 'Online Shopping', route: ['shop'] },
        { label: 'Reddem Voucher', route: ['shop'] }
      ]
    },
    {
      title: 'My Account',
      
      links: [
        { label: 'My Account', route: ['account'] },
        { label: 'Order History', route: ['orders'] },
        { label: 'Shopping Cart', route: ['cart'] },
        { label: 'Compare', route: ['compare'] },
        { label: 'Help Ticket', route: ['help-ticket'] },
        { label: 'Favoritos', route: ['my-account/favoritos'] },
        { label: 'Order History', route: ['my-account/favoritos'] },
        { label: 'Product Support', route: ['my-account/favoritos'] },

      ]
    },
    {
      title: 'Information',
      links: [
        { label: 'Become a Vendor', route: ['shop'] },
        { label: 'Affiliate Program', route: ['shop'] },
        { label: 'Privacy Policy', route: ['privacy-policy'] },
        { label: 'Our Suppliers', route: ['suppliers'] },
        { label: 'Extended Plan', route: ['plans'] },
        { label: 'Extended Plan', route: ['plans'] },
        { label: 'Community', route: ['community'] },
        { label: 'Community', route: ['community'] }
      ]
    },

  ];

}
