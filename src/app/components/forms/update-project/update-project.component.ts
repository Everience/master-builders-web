import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project/project.service';
import { ToastService } from '../../../services/project/toast.service';

export interface ProjectCodeSuggestion {
  code: string;
  name: string;
}

@Component({
  selector: 'app-update-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-project.component.html',
  styleUrl: './update-project.component.scss'
})
export class UpdateProjectComponent implements OnInit, OnDestroy {
  currentProjectId: string | null = null;
  isSearching = false;
  isSubmitting = false;
  projectForm!: FormGroup;

  private loadedProjectCodeLower: string | null = null;

  readonly minCharsForSuggestions = 3;
  readonly maxSuggestions = 20;

  isLoadingProjectCodes = false;
  projectCodesLoaded = false;
  codeSuggestionsLoadError = false;
  private projectCatalog: ProjectCodeSuggestion[] = [];
  codeSuggestions: ProjectCodeSuggestion[] = [];
  showCodeSuggestions = false;
  suggestionActiveIndex = -1;
  private blurCloseTimer: ReturnType<typeof setTimeout> | null = null;
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

  ngOnDestroy(): void {
    this.clearBlurTimer();
  }

  private clearBlurTimer(): void {
    if (this.blurCloseTimer != null) {
      clearTimeout(this.blurCloseTimer);
      this.blurCloseTimer = null;
    }
  }

  loadProjectCodesForAutocomplete(): void {
    if (this.isLoadingProjectCodes || this.projectCodesLoaded) {
      this.refreshCodeSuggestions();
      return;
    }
    this.isLoadingProjectCodes = true;
    this.projectService.getProjects().subscribe({
      next: (res) => {
        const projects = res.projects || res || [];
        const byLower = new Map<string, ProjectCodeSuggestion>();
        for (const p of projects) {
          const raw = (p as { project_code?: string }).project_code;
          if (raw == null || String(raw).trim() === '') continue;
          const code = String(raw).trim();
          const key = code.toLowerCase();
          if (!byLower.has(key)) {
            byLower.set(key, {
              code,
              name: String((p as { project_name?: string }).project_name || ''),
            });
          }
        }
        this.projectCatalog = Array.from(byLower.values()).sort((a, b) =>
          a.code.toLowerCase().localeCompare(b.code.toLowerCase())
        );
        this.projectCodesLoaded = true;
        this.codeSuggestionsLoadError = false;
        this.isLoadingProjectCodes = false;
        this.refreshCodeSuggestions();
      },
      error: () => {
        this.isLoadingProjectCodes = false;
        this.codeSuggestionsLoadError = true;
        this.toast.error('Could not load project list for code suggestions.');
      },
    });
  }

  onProjectCodeFocus(): void {
    this.clearBlurTimer();
    this.loadProjectCodesForAutocomplete();
    this.showCodeSuggestions = true;
    this.refreshCodeSuggestions();
  }

  onProjectCodeInput(): void {
    const q = this.getProjectCodeQuery();
    if (
      this.currentProjectId &&
      this.loadedProjectCodeLower &&
      q.toLowerCase() !== this.loadedProjectCodeLower
    ) {
      this.currentProjectId = null;
      this.loadedProjectCodeLower = null;
      this.clearAutofilledFields();
    }
    this.showCodeSuggestions = true;
    this.suggestionActiveIndex = -1;
    if (this.getProjectCodeQuery().length >= this.minCharsForSuggestions) {
      this.loadProjectCodesForAutocomplete();
    }
    this.refreshCodeSuggestions();
  }

  onProjectCodeBlur(): void {
    this.clearBlurTimer();
    this.blurCloseTimer = setTimeout(() => {
      this.showCodeSuggestions = false;
      this.suggestionActiveIndex = -1;
      this.blurCloseTimer = null;
    }, 180);
  }

  onProjectCodeKeydown(event: KeyboardEvent): void {
    const hasPanel =
      this.showCodeSuggestions &&
      this.getProjectCodeQuery().length >= this.minCharsForSuggestions &&
      (this.codeSuggestions.length > 0 || this.isLoadingProjectCodes);

    if (event.key === 'ArrowDown' && hasPanel && this.codeSuggestions.length > 0) {
      event.preventDefault();
      this.suggestionActiveIndex = Math.min(
        this.suggestionActiveIndex + 1,
        this.codeSuggestions.length - 1
      );
      return;
    }
    if (event.key === 'ArrowUp' && hasPanel && this.codeSuggestions.length > 0) {
      event.preventDefault();
      this.suggestionActiveIndex = Math.max(this.suggestionActiveIndex - 1, -1);
      return;
    }
    if (event.key === 'Escape' && this.showCodeSuggestions) {
      event.preventDefault();
      this.showCodeSuggestions = false;
      this.suggestionActiveIndex = -1;
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (
        this.showCodeSuggestions &&
        this.codeSuggestions.length === 1 &&
        this.suggestionActiveIndex < 0
      ) {
        this.applySuggestion(this.codeSuggestions[0]);
        return;
      }
      if (
        this.showCodeSuggestions &&
        this.codeSuggestions.length > 0 &&
        this.suggestionActiveIndex >= 0
      ) {
        this.applySuggestion(this.codeSuggestions[this.suggestionActiveIndex]);
      } else {
        this.searchProject();
      }
    }
  }

  selectSuggestion(suggestion: ProjectCodeSuggestion, event: MouseEvent): void {
    event.preventDefault();
    this.applySuggestion(suggestion);
  }

  private applySuggestion(suggestion: ProjectCodeSuggestion): void {
    this.clearBlurTimer();
    this.showCodeSuggestions = false;
    this.suggestionActiveIndex = -1;
    this.projectForm.patchValue({ projectCode: suggestion.code }, { emitEvent: false });
    this.searchProject();
  }

  getProjectCodeQuery(): string {
    const raw = this.projectForm?.get('projectCode')?.value;
    return raw != null ? String(raw).trim() : '';
  }

  refreshCodeSuggestions(): void {
    const q = this.getProjectCodeQuery();
    const qLower = q.toLowerCase();

    if (q.length < this.minCharsForSuggestions) {
      this.codeSuggestions = [];
      this.suggestionActiveIndex = -1;
      return;
    }

    this.codeSuggestions = this.projectCatalog
      .filter((row) => row.code.toLowerCase().startsWith(qLower))
      .slice(0, this.maxSuggestions);
    if (this.suggestionActiveIndex >= this.codeSuggestions.length) {
      this.suggestionActiveIndex = this.codeSuggestions.length ? this.codeSuggestions.length - 1 : -1;
    }
  }

  trackSuggestionCode(_: number, s: ProjectCodeSuggestion): string {
    return s.code.toLowerCase();
  }

searchProject() {
  const code = this.projectForm.get('projectCode')?.value?.trim();
  if (!code) return;

  this.isSearching = true;
  this.showCodeSuggestions = false;
  this.suggestionActiveIndex = -1;

  this.projectService.getProjectByCode(code).subscribe({
    next: (res) => {
      const p = res.project;
      this.currentProjectId = p.project_id;
      this.loadedProjectCodeLower = code.toLowerCase();
      this.existingFiles = res.files || []; 
      this.attachmentsLink = p.attachments_link || '';

      this.projectForm.patchValue({
        projectName:     p.project_name,
        projectStatus:   p.project_status,
        innovationArea:  p.innovation_area,
        region:          p.region,
        marketSegment:   p.market_segment,
        notes:           p.notes,
        projectPhase:    p.project_phase,
        attachmentsLink: p.attachments_link || '',
      }, { emitEvent: false });

      ['projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment']
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
