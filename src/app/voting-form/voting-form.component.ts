import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-voting-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voting-form.component.html',
  styleUrl: './voting-form.component.scss',
})
export class VotingFormComponent {
  votingForm: FormGroup;

  teams = ['Marketing', 'Sviluppo'];
  projectStatuses = ['In Progress', 'On Hold', 'Completed'];
  innovationAreas = [
    'Advanced rheology',
    'Stength development',
    'Durability',
    'Sustainability',
    'Cost efficiency',
    'Growth',
  ];
  regions = ['AMET', 'ANZ', 'EU', 'GLOBAL', 'BA', 'SA'];
  marketSegments = ['AS', 'CA', 'CS', 'FIBERS', 'UGC', 'VTG'];
  scores = [1, 2, 3, 4, 5];

  onSubmit() {
    if (this.votingForm.valid) {
      console.log('Form Data:', this.votingForm.value);
      alert('Form submitted successfully!');
    } else {
      this.votingForm.markAllAsTouched();
    }
  }

  constructor(private fb: FormBuilder) {
    this.votingForm = this.fb.group({
      team: ['', Validators.required],
      projectName: ['', Validators.required],
      projectStatus: ['', Validators.required],
      innovationArea: ['', Validators.required],
      region: ['', Validators.required],
      marketSegment: ['', Validators.required],
      projectDocs: ['', Validators.required],
      notes: [''],
      score: ['', Validators.required],
      scoreReason: ['', Validators.required],
    });
  }
}
