import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project/project.service';
import { Subject } from 'rxjs';
import { ToastService } from '../../../services/project/toast.service';


@Component({
  selector: 'app-update-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-project.component.html',
  styleUrl: './update-project.component.scss'
})
export class UpdateProjectComponent implements OnInit {
  currentProjectId: string | null = null;
  isSearching = false;
  isSubmitting = false;
  projectForm!: FormGroup;
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

  constructor(private fb: FormBuilder, private router: Router, private projectService: ProjectService, private toast: ToastService) {
    
  }

  ngOnInit() {
    this.projectForm = this.fb.group({
      projectCode:    ['', Validators.required],
      projectName:    ['', Validators.required],
      projectStatus:  ['', Validators.required],
      innovationArea: ['', Validators.required],
      region:         ['', Validators.required],
      marketSegment:  ['', Validators.required],
      projectPhase:   ['', Validators.required],
      notes:          [''],
      attachmentsLink:[''],
    });
  }

  searchProject() {
    const code = this.projectForm.get('projectCode')?.value?.trim();
    if (!code) return;

    this.isSearching = true;

    this.projectService.getProjectByCode(code).subscribe({
      next: (res) => {
        const p = res.project;
        this.currentProjectId = p.project_id;
        console.log(this.currentProjectId)
        this.projectForm.patchValue({
          projectName:    p.project_name,
          projectStatus:  p.project_status,
          innovationArea: p.Innovation_area,
          region:         p.region,
          marketSegment:  p.market_segment,
          notes:          p.notes,
          projectPhase:   p.project_phase,
          attachmentsLink: p.attachments_link || '',
        }, { emitEvent: false });

        ['projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes', 'projectPhase']
          .forEach(field => this.projectForm.get(field)!.disable({ emitEvent: false }));

        this.isSearching = false;
      },
      error: (err) => {
        console.error('Project not found:', err);
        this.clearAutofilledFields();
        this.isSearching = false;
        this.handleError(err); 
      }
    });
  }

  clearAutofilledFields() {
    ['projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes', 'projectPhase']
      .forEach(field => this.projectForm.get(field)!.enable({ emitEvent: false }));

    this.projectForm.patchValue({
      projectName:    '',
      projectStatus:  '',
      innovationArea: '',
      region:         '',
      marketSegment:  '',
      notes:          '',
      projectPhase:   '',
      attachmentsLink:'',
    }, { emitEvent: false });
  }

  onSubmit() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    if (!this.currentProjectId) {
      this.toast.warning('Cerca prima un progetto tramite il codice.');
      return;
    }

    this.isSubmitting = true;

    //getRawValue() gets values from disabled fields too
    const f = this.projectForm.getRawValue();

    const payload = {
      old_project_id:     this.currentProjectId,
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

    this.projectService.updateProject(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Progetto aggiornato con successo!');
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
          this.toast.error(`Dati non validi: ${messages}`);
        } else {
          this.toast.error(err.error?.error || 'Dati non validi. Controlla i campi.');
        }
        break;
      case 401:
        this.toast.error('Sessione scaduta. Effettua di nuovo il login.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('Non hai i permessi per modificare questo progetto.');
        break;
      case 404:
        this.toast.error('Nessun progetto trovato con questo codice.');
        break;
      case 500:
        this.toast.error('Errore interno al server. Riprova più tardi.');
        break;
      default:
        this.toast.error('Qualcosa è andato storto. Riprova.');
    }
  }

  goBack() {
      this.router.navigate(['/home']);
    }
}
