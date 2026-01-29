import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorTwoDetailsComponent } from './vendor-two-details.component';

describe('VendorTwoDetailsComponent', () => {
  let component: VendorTwoDetailsComponent;
  let fixture: ComponentFixture<VendorTwoDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorTwoDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorTwoDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
