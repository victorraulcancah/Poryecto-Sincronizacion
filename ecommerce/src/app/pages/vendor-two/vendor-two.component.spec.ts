import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorTwoComponent } from './vendor-two.component';

describe('VendorTwoComponent', () => {
  let component: VendorTwoComponent;
  let fixture: ComponentFixture<VendorTwoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorTwoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorTwoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
