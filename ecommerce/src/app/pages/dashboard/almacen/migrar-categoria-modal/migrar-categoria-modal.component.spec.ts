import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MigrarCategoriaModalComponent } from './migrar-categoria-modal.component';

describe('MigrarCategoriaModalComponent', () => {
  let component: MigrarCategoriaModalComponent;
  let fixture: ComponentFixture<MigrarCategoriaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigrarCategoriaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MigrarCategoriaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
