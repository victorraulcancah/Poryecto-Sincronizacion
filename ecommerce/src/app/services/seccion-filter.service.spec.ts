import { TestBed } from '@angular/core/testing';

import { SeccionFilterService } from './seccion-filter.service';

describe('SeccionFilterService', () => {
  let service: SeccionFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeccionFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
