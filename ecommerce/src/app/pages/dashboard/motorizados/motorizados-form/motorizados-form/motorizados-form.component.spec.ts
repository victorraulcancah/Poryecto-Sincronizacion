import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotorizadosFormComponent } from './motorizados-form.component';

describe('MotorizadosFormComponent', () => {
  let component: MotorizadosFormComponent;
  let fixture: ComponentFixture<MotorizadosFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotorizadosFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MotorizadosFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
