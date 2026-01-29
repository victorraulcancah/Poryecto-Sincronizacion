import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotorizadosListComponent } from './motorizados-list.component';

describe('MotorizadosListComponent', () => {
  let component: MotorizadosListComponent;
  let fixture: ComponentFixture<MotorizadosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotorizadosListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MotorizadosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
