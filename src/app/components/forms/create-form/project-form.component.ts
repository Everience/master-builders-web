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
      attachmentsLink:  [''],
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
  }

  onSubmit() {
  if (this.projectForm.invalid) {
    this.projectForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;

  const f = this.projectForm.value;
  const payload = {
    project_name:       f.projectName,
    project_code:       f.projectCode,
    region:             f.region,
    market_segment:     f.marketSegment,
    project_phase:      f.projectPhase,
    project_status:     f.projectStatus,
    notes:              f.notes || '',
    attachments_link:   f.attachmentsLink || '',
    project_visibility: 'Active',
    innovation_area:    f.innovationArea,
  };

  this.projectService.createProject(payload).subscribe({
    next: () => {
      this.isSubmitting = false;
      this.toast.success('Progetto creato con successo!');
      setTimeout(() => this.router.navigate(['/home']), 2000);
    },
    error: (err: any) => {
      this.isSubmitting = false;
      this.handleError(err);
    }
  });
}


  private handleError(err: any) {
  const status = err.status;

  switch (status) {
    case 400:
      const errors = err.error?.errors;
      if (errors) {
        const messages = Object.values(errors).join(' | ');
        this.toast.error(`Dati non validi: ${messages}`);
      } else {
        this.toast.error('Dati non validi. Controlla i campi.');
      }
      break;

    case 401:
      this.toast.error('Sessione scaduta. Effettua di nuovo il login.');
      setTimeout(() => this.router.navigate(['/login']), 2000);
      break;

    case 403:
      this.toast.error('Non hai i permessi per creare un progetto.');
      break;

    case 409:
      this.toast.error('Esiste già un progetto con lo stesso Project Code.');
      break;

    case 500:
      this.toast.error('Errore interno al server. Riprova più tardi.');
      break;

    default:
      this.toast.error('Qualcosa è andato storto. Riprova.');
  }
}
}
