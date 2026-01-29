import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndexLaptopComponent } from './index-laptop.component';

describe('IndexLaptopComponent', () => {
  let component: IndexLaptopComponent;
  let fixture: ComponentFixture<IndexLaptopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndexLaptopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndexLaptopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
