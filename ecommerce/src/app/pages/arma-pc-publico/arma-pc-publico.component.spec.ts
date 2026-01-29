import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArmaPcPublicoComponent } from './arma-pc-publico.component';

describe('ArmaPcPublicoComponent', () => {
  let component: ArmaPcPublicoComponent;
  let fixture: ComponentFixture<ArmaPcPublicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArmaPcPublicoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArmaPcPublicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
