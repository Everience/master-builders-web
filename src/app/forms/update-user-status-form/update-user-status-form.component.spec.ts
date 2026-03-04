import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateUserStatusFormComponent } from './update-user-status-form.component';

describe('UpdateUserStatusFormComponent', () => {
  let component: UpdateUserStatusFormComponent;
  let fixture: ComponentFixture<UpdateUserStatusFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateUserStatusFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateUserStatusFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
