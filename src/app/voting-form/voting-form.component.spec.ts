import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VotingFormComponent } from './voting-form.component';

describe('VotingFormComponent', () => {
  let component: VotingFormComponent;
  let fixture: ComponentFixture<VotingFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VotingFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VotingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
