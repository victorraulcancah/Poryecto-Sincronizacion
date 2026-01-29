import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductDetailsTwoComponent } from './product-details-two.component';

describe('ProductDetailsTwoComponent', () => {
  let component: ProductDetailsTwoComponent;
  let fixture: ComponentFixture<ProductDetailsTwoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailsTwoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductDetailsTwoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
