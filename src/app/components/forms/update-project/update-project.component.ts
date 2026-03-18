import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project/project.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-update-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-project.component.html',
  styleUrl: './update-project.component.scss'
})
export class UpdateProjectComponent {

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

  constructor(private fb: FormBuilder, private router: Router, private projectService: ProjectService) {
    this.projectForm = this.fb.group({
      projectID: ['', Validators.required],
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

  goBack() {
      this.router.navigate(['/home']);
    }

    onFileSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.uploadedFiles.push(...files);
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
    this.getAllProjects();
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

    loadProject() {
    this.projectService.getProjectById(123).subscribe({
      next: (res) => {
        console.log(res.project);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

    getAllProjects() {
  this.projectService.getProjects().subscribe({
    next: (res) => {
      // check res.projects exists
      console.log('Projects:', res.projects || res); 
    },
    error: (err) => {
      console.error('Error fetching projects:', err);
    }
  });
}
}
