import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/project/toast.service';
import { ProjectService } from '../../../services/project/project.service';

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
  isSubmitting: boolean = false;
  readonly MAX_FILES = 10;
  readonly MAX_SIZE_MB = 10;

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

  constructor(private fb: FormBuilder, private router: Router, private toast: ToastService, private projectService: ProjectService) {
    this.projectForm = this.fb.group({
      projectCode: ['', Validators.required],
      projectName: ['', Validators.required],
      region: ['', Validators.required],
      marketSegment: ['', Validators.required],
      innovationArea: ['', Validators.required],
      projectPhase: ['', Validators.required],
      projectStatus: ['', Validators.required],
      notes: [''],
    });
  }

  onFileSelected(event: any) {
    const selected = Array.from(event.target.files) as File[];

    for (const file of selected) {
      if (this.uploadedFiles.length >= this.MAX_FILES) {
        this.toast.warning(`You can upload a maximum of ${this.MAX_FILES} file.`);
        break;
      }
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        this.toast.warning(`The file "${file.name}" exceeds the ${this.MAX_SIZE_MB}MB limit.`);
        continue;
      }
      this.uploadedFiles.push(file);
    }

    // reset input so same file can be re-selected if removed
    event.target.value = '';
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
  }

  triggerFileInput() {
    document.getElementById('fileInput')?.click();
  }

  onSubmit() {
  if (this.projectForm.invalid) {
    this.projectForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;

  const f = this.projectForm.value;
  const formData = new FormData();
    formData.append('project_name',       f.projectName);
    formData.append('project_code',       f.projectCode);
    formData.append('region',             f.region);
    formData.append('market_segment',     f.marketSegment);
    formData.append('project_phase',      f.projectPhase);
    formData.append('project_status',     f.projectStatus);
    formData.append('notes',              f.notes || '');
    formData.append('attachments_link',   '');
    formData.append('project_visibility', 'active');
    formData.append('innovation_area',    f.innovationArea);

    //append each file
    for (const file of this.uploadedFiles) {
      formData.append('files', file, file.name);
    }

    this.projectService.createProjectWithFiles(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Project created successfully!');
        setTimeout(() => this.router.navigate(['/home']), 2000);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.handleError(err);
      }
    });
  }

  private handleError(err: any) {
    switch (err.status) {
      case 400:
        const errors = err.error?.errors;
        if (errors) {
          const messages = Object.values(errors).join(' | ');
          this.toast.error(`Invalid data: ${messages}`);
        } else {
          this.toast.error('Invalid data. Please check the fields.');
        }
        break;
      case 401:
        this.toast.error('Session expired. Please log in again.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('You do not have permission to create a project.');
        break;
      case 409:
        this.toast.error('A project with the same Project Code already exists.');
        break;
      case 500:
        this.toast.error('Internal server error. Please try again later.');
        break;
      default:
        this.toast.error('Something went wrong. Please try again.');
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
