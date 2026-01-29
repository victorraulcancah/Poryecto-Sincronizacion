import { TestBed } from '@angular/core/testing';

import { MotorizadosService } from './motorizados.service';

describe('MotorizadosService', () => {
  let service: MotorizadosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MotorizadosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
