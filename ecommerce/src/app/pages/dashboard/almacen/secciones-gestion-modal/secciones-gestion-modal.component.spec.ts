import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionesGestionModalComponent } from './secciones-gestion-modal.component';

describe('SeccionesGestionModalComponent', () => {
  let component: SeccionesGestionModalComponent;
  let fixture: ComponentFixture<SeccionesGestionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionesGestionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionesGestionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
