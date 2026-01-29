import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionModalComponent } from './seccion-modal.component';

describe('SeccionModalComponent', () => {
  let component: SeccionModalComponent;
  let fixture: ComponentFixture<SeccionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
