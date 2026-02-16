import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiTestComponent } from './bi-test.component';

describe('BiTestComponent', () => {
  let component: BiTestComponent;
  let fixture: ComponentFixture<BiTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiTestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BiTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
