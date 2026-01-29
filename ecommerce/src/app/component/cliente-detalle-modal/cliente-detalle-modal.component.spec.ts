import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteDetalleModalComponent } from './cliente-detalle-modal.component';

describe('ClienteDetalleModalComponent', () => {
  let component: ClienteDetalleModalComponent;
  let fixture: ComponentFixture<ClienteDetalleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteDetalleModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteDetalleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
