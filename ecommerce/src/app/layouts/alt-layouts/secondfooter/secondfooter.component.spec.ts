import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondfooterComponent } from './secondfooter.component';

describe('SecondfooterComponent', () => {
  let component: SecondfooterComponent;
  let fixture: ComponentFixture<SecondfooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecondfooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecondfooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
