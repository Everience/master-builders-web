import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.scss',
})
export class ProjectFormComponent {
  projectForm: FormGroup;
  uploadedFiles: File[] = [];

  regions = ['AMET', 'ANZ', 'EU', 'GLOBAL', 'BA', 'SA'];
  marketSegments = ['AS', 'CA', 'CS', 'FIBERS', 'UGC', 'VTG'];
  innovationAreas = [
    'Advanced rheology',
    'Stength development',
    'Durability',
    'Sustainability',
    'Cost efficiency',
    'Growth',
  ];
  projectPhases = ['Business Case', 'Lab Phase', 'Pilot Phase', 'Launch Phase'];
  projectStatuses = ['In Progress', 'On Hold', 'Completed'];

  constructor(private fb: FormBuilder) {
    this.projectForm = this.fb.group({
      projectCode: ['', Validators.required],
      projectName: ['', Validators.required],
      region: ['', Validators.required],
      marketSegment: ['', Validators.required],
      innovationArea: ['', Validators.required],
      projectPhase: ['', Validators.required],
      projectStatus: ['', Validators.required],
      notes: [''],
      attachments: [null],
    });
  }

  onFileSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.uploadedFiles.push(...files);
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
  }

  onSubmit() {
    if (this.projectForm.valid) {
      console.log('Form Data:', this.projectForm.value);
      console.log('Uploaded Files:', this.uploadedFiles);
      alert('Form submitted successfully!');
    } else {
      this.projectForm.markAllAsTouched();
    }
  }
}
