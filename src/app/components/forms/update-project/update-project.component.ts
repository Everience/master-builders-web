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

  //files handling
  existingFiles: { filename: string; blob_url: string }[] = [];
  newFiles: File[] = [];
  readonly MAX_FILES = 10;
  readonly MAX_SIZE_MB = 10;
  attachmentsLink: string = '';

  constructor(private fb: FormBuilder, private router: Router, private projectService: ProjectService, private toast: ToastService) {
    
  }

  ngOnInit() {
  this.projectForm = this.fb.group({
    projectCode:     ['', Validators.required],
    projectName:     ['', Validators.required],
    projectStatus:   ['', Validators.required],
    innovationArea:  ['', Validators.required],
    region:          ['', Validators.required],
    marketSegment:   ['', Validators.required],
    projectPhase:    ['', Validators.required],
    notes:           ['', Validators.required],
    attachmentsLink: [''],
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
      this.existingFiles = res.files || []; 
      this.attachmentsLink = p.attachments_link || '';

      this.projectForm.patchValue({
        projectName:     p.project_name,
        projectStatus:   p.project_status,
        innovationArea:  p.Innovation_area,
        region:          p.region,
        marketSegment:   p.market_segment,
        notes:           p.notes,
        projectPhase:    p.project_phase,
        attachmentsLink: p.attachments_link || '',
      }, { emitEvent: false });

      ['projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment']
        .forEach(field => this.projectForm.get(field)!.disable({ emitEvent: false }));

        this.isSearching = false;
        this.toast.info('Progetto trovato. Modifica i campi necessari.');
      },
      error: (err: any) => {
        this.isSearching = false;
        this.currentProjectId = null;
        this.clearAutofilledFields();
        this.handleError(err);
      }
    });
  }

  clearAutofilledFields() {
    ['projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment']
      .forEach(field => this.projectForm.get(field)!.enable({ emitEvent: false }));

    this.projectForm.patchValue({
      projectName:     '',
      projectStatus:   '',
      innovationArea:  '',
      region:          '',
      marketSegment:   '',
      notes:           '',
      projectPhase:    '',
      attachmentsLink: '',
    }, { emitEvent: false });

    this.existingFiles = [];
    this.newFiles = [];
    this.attachmentsLink = '';
  }

  onFileSelected(event: any) {
    const selected = Array.from(event.target.files) as File[];
    for (const file of selected) {
      if (this.newFiles.length >= this.MAX_FILES) {
        this.toast.warning(`Puoi caricare al massimo ${this.MAX_FILES} file.`);
        break;
      }
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        this.toast.warning(`"${file.name}" supera i ${this.MAX_SIZE_MB}MB.`);
        continue;
      }
      this.newFiles.push(file);
    }
    event.target.value = '';
  }

  removeNewFile(index: number) {
    this.newFiles.splice(index, 1);
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':          return '📄';
      case 'doc':
      case 'docx':         return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':          return '🖼️';
      case 'xls':
      case 'xlsx':         return '📊';
      default:             return '📎';
    }
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
    const f = this.projectForm.getRawValue();

    // ✅ if files selected → multipart, otherwise → JSON
    if (this.newFiles.length > 0) {
      const formData = new FormData();
      formData.append('old_project_id',    this.currentProjectId);
      formData.append('project_name',      f.projectName);
      formData.append('project_code',      f.projectCode);
      formData.append('region',            f.region);
      formData.append('market_segment',    f.marketSegment);
      formData.append('project_phase',     f.projectPhase);
      formData.append('project_status',    f.projectStatus);
      formData.append('notes',             f.notes || '');
      formData.append('attachments_link',  f.attachmentsLink || '');
      formData.append('project_visibility','active');
      formData.append('innovation_area',   f.innovationArea);

      for (const file of this.newFiles) {
        formData.append('files', file, file.name);
      }

      this.projectService.updateProjectWithFiles(formData).subscribe({
        next: () => this.handleSuccess(),
        error: (err: any) => {
          this.isSubmitting = false;
          this.handleError(err);
        }
      });
    } else {
      // no files → use standard JSON endpoint
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
        project_visibility: 'active',
        innovation_area:    f.innovationArea,
      };

      this.projectService.updateProject(payload).subscribe({
        next: () => this.handleSuccess(),
        error: (err: any) => {
          this.isSubmitting = false;
          this.handleError(err);
        }
      });
    }
  }

  private handleSuccess() {
    this.isSubmitting = false;
    this.toast.success('Progetto aggiornato con successo!');
    setTimeout(() => this.router.navigate(['/home']), 2000);
  }

  private handleError(err: any) {
    switch (err.status) {
      case 400:
        const errors = err.error?.errors;
        if (errors) {
          this.toast.error(`Dati non validi: ${Object.values(errors).join(' | ')}`);
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
