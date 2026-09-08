import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project/project.service';
import { ToastService } from '../../../services/project/toast.service';
import {
  ProjectResolvedEvent,
  ProjectSearchAutocompleteComponent,
} from '../../shared/project-search-autocomplete/project-search-autocomplete.component';

@Component({
  selector: 'app-update-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProjectSearchAutocompleteComponent],
  templateUrl: './update-project.component.html',
  styleUrl: './update-project.component.scss'
})
export class UpdateProjectComponent implements OnInit {
  currentProjectId: string | null = null;
  isSearching = false;
  isSubmitting = false;
  projectForm!: FormGroup;

  private loadedProjectCodeLower: string | null = null;
  private loadedLookupSnapshotLower: string | null = null;
  private pendingPickSearchMode: 'code' | 'name' | null = null;
  private readonly destroyRef = inject(DestroyRef);

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
    projectLookup:   [''],
    projectName:     ['', Validators.required],
    projectStatus:   ['', Validators.required],
    innovationArea:  ['', Validators.required],
    region:          ['', Validators.required],
    marketSegment:   ['', Validators.required],
    projectPhase:    ['', Validators.required],
    notes:           ['', Validators.required],
    attachmentsLink: [''],
  });
  this.projectForm.get('projectLookup')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
    const snap = this.loadedLookupSnapshotLower;
    if (snap == null) return;
    const q = this.projectForm.get('projectLookup')?.value?.trim().toLowerCase() ?? '';
    if (this.currentProjectId && q !== snap) {
      this.currentProjectId = null;
      this.loadedProjectCodeLower = null;
      this.loadedLookupSnapshotLower = null;
      this.pendingPickSearchMode = null;
      this.clearAutofilledFields();
    }
  });
}

  onProjectSearchResolved(ev: ProjectResolvedEvent): void {
    const code = String(ev.row?.project_code ?? '').trim();
    if (!code) return;
    this.pendingPickSearchMode = ev.searchMode;
    const lookup =
      ev.searchMode === 'name'
        ? String(ev.row.project_name ?? '').trim()
        : code;
    this.projectForm.patchValue(
      { projectCode: code, projectLookup: lookup },
      { emitEvent: false }
    );
    this.searchProject();
  }

  onSearchFromLookup(): void {
    const raw = this.projectForm.get('projectLookup')?.value?.trim() ?? '';
    if (!raw) return;
    this.pendingPickSearchMode = null;
    this.projectForm.patchValue({ projectCode: raw }, { emitEvent: false });
    this.searchProject();
  }

  //helper to normalize cases
  private matchOption(value: string, options: string[]): string {
    const v = String(value ?? '').trim().toLowerCase();
    return options.find(o => o.toLowerCase() === v) ?? '';
  }

searchProject() {
  const code = this.projectForm.get('projectCode')?.value?.trim();
  if (!code) return;

  this.isSearching = true;

  this.projectService.getProjectByCode(code).subscribe({
    next: (res) => {
      const p = res.project;
      this.currentProjectId = p.project_id;
      this.loadedProjectCodeLower = code.toLowerCase();
      const display =
        this.pendingPickSearchMode === 'name'
          ? String(p.project_name ?? '').trim()
          : String(p.project_code ?? code).trim();
      this.projectForm.patchValue({ projectLookup: display }, { emitEvent: false });
      this.loadedLookupSnapshotLower = display.toLowerCase();
      this.pendingPickSearchMode = null;
      this.existingFiles = res.files || []; 
      this.attachmentsLink = p.attachments_link || '';

      this.projectForm.patchValue({
        projectCode:     String(p.project_code ?? code).trim(),
        projectName:     p.project_name,
        projectStatus:   this.matchOption(p.project_status, this.projectStatuses),
        innovationArea:  this.matchOption(p.innovation_area, this.innovationAreas),
        region:          p.region,
        marketSegment:   p.market_segment,
        notes:           p.notes,
        projectPhase:    this.matchOption(p.project_phase, this.projectPhases), 
        attachmentsLink: p.attachments_link || '',
      }, { emitEvent: false });

      ['projectCode', 'projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment']
        .forEach(field => this.projectForm.get(field)!.disable({ emitEvent: false }));

        this.isSearching = false;
        this.toast.info('Project found. Edit the fields you want to update.');
      },
      error: (err: any) => {
        this.isSearching = false;
        this.currentProjectId = null;
        this.loadedProjectCodeLower = null;
        this.clearAutofilledFields();
        this.handleError(err);
      }
    });
  }

  clearAutofilledFields() {
    this.loadedProjectCodeLower = null;
    this.loadedLookupSnapshotLower = null;
    this.pendingPickSearchMode = null;
    ['projectCode', 'projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment']
      .forEach(field => this.projectForm.get(field)!.enable({ emitEvent: false }));

    this.projectForm.patchValue({
      projectCode:     '',
      projectLookup:   '',
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

  triggerFileInput() {
    document.getElementById('updateFileInput')?.click();
  }

  onFileSelected(event: any) {
    const selected = Array.from(event.target.files) as File[];
    for (const file of selected) {
      if (this.newFiles.length >= this.MAX_FILES) {
        this.toast.warning(`You can upload a maximum of ${this.MAX_FILES} file.`);
        break;
      }
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        this.toast.warning(`"${file.name}" exceeds the ${this.MAX_SIZE_MB}MB limit.`);
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
      default:             return '📁';
    }
  }

  onSubmit() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    if (!this.currentProjectId) {
      this.toast.warning('Please search for a project first.');
      return;
    }

    this.isSubmitting = true;
    const f = this.projectForm.getRawValue();

    //if files selected → multipart, otherwise → JSON
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
    this.toast.success('Project updated successfully!');
    setTimeout(() => this.router.navigate(['/home']), 2000);
  }

  private handleError(err: any) {
    switch (err.status) {
      case 400:
        const errors = err.error?.errors;
        if (errors) {
          this.toast.error(`Invalid data: ${Object.values(errors).join(' | ')}`);
        } else {
          this.toast.error(err.error?.error || 'Invalid data, please check the fields.');
        }
        break;
      case 401:
        this.toast.error('Session expired. Please, login again.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('You do not have permission to modify this project.');
        break;
      case 404:
        this.toast.error('No project found with the current code.');
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
