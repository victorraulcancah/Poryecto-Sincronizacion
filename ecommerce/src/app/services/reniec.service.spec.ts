import { TestBed } from '@angular/core/testing';

import { ReniecService } from './reniec.service';

describe('ReniecService', () => {
  let service: ReniecService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReniecService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
