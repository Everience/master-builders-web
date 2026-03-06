import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-update-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-form.component.html',
  styleUrl: './update-form.component.scss'
})
export class UpdateFormComponent {
  votingForm: FormGroup;
  projectStatuses = ['In Progress', 'On Hold', 'Completed'];
   
    onSubmit() {
      if (this.votingForm.valid) {
        console.log('Form Data:', this.votingForm.value);
        alert('Form submitted successfully!');
      } else {
        this.votingForm.markAllAsTouched();
      }
    }

    goBack() {
    this.router.navigate(['/home']);
  }
  
    constructor(private fb: FormBuilder, private router: Router) {
      this.votingForm = this.fb.group({
        projectID: ['', Validators.required],
        projectStatus: ['', Validators.required],
        projectVisibility: ['', Validators.required]
      });
    }
}
