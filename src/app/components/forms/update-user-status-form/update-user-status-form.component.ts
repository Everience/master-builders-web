import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-update-user-status-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-user-status-form.component.html',
  styleUrl: './update-user-status-form.component.scss'
})
export class UpdateUserStatusFormComponent {
  userStatusForm: FormGroup;
    onSubmit() {
      if (this.userStatusForm.valid) {
        console.log('Form Data:', this.userStatusForm.value);
        alert('Form submitted successfully!');
      } else {
        this.userStatusForm.markAllAsTouched();
      }
    }

    goBack() {
    this.router.navigate(['/home']);
  }
  
    constructor(private fb: FormBuilder, private router: Router) {
      this.userStatusForm = this.fb.group({
        userID: ['', Validators.required],
        userStatus: ['', Validators.required],
      });
    }
}
