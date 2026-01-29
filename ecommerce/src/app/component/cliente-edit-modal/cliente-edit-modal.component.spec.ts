import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteEditModalComponent } from './cliente-edit-modal.component';

describe('ClienteEditModalComponent', () => {
  let component: ClienteEditModalComponent;
  let fixture: ComponentFixture<ClienteEditModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteEditModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteEditModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
