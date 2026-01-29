// src/app/pages/shop/shop.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { ShopComponent } from './shop.component';
import { VendorComponent } from '../vendor/vendor.component';
import { VendorDetailsComponent } from '../vendor-details/vendor-details.component';
import { VendorTwoComponent } from '../vendor-two/vendor-two.component';
import { VendorTwoDetailsComponent } from '../vendor-two-details/vendor-two-details.component';
import { ProductDetailsComponent } from '../product-details/product-details.component';
import { ProductDetailsTwoComponent } from '../product-details-two/product-details-two.component';

const routes: Routes = [
  { path: '', component: ShopComponent, title: 'Shop' },
  { path: 'vendor', component: VendorComponent, title: 'Vendor' },
  { path: 'vendor-details', component: VendorDetailsComponent, title: 'Vendor Details' },
  { path: 'vendor-two', component: VendorTwoComponent, title: 'Vendor Two' },
  { path: 'vendor-two-details', component: VendorTwoDetailsComponent, title: 'Vendor Two Details' },
  { path: 'product-details', component: ProductDetailsComponent, title: 'Product Details' },
  { path: 'product-details-two', component: ProductDetailsTwoComponent, title: 'Product Details Two' }
];

@NgModule({
  declarations: [
    ShopComponent,
    VendorComponent,
    VendorDetailsComponent,
    VendorTwoComponent,
    VendorTwoDetailsComponent,
    ProductDetailsComponent,
    ProductDetailsTwoComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ShopModule { }