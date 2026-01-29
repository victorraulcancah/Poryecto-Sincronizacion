// src\app\layouts\alt-layouts\secondlayout\secondlayout.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondlayoutComponent } from './secondlayout.component';

describe('SecondlayoutComponent', () => {
  let component: SecondlayoutComponent;
  let fixture: ComponentFixture<SecondlayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecondlayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecondlayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
