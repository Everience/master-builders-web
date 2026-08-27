import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project/project.service';
import { ToastService } from '../../../services/project/toast.service';
import {
  ProjectResolvedEvent,
  ProjectSearchAutocompleteComponent,
} from '../../shared/project-search-autocomplete/project-search-autocomplete.component';

@Component({
  selector: 'app-update-visibility-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProjectSearchAutocompleteComponent],
  templateUrl: './update-form.component.html',
  styleUrl: './update-form.component.scss'
})

export class UpdateFormComponent implements OnInit {
  projectStatusForm!: FormGroup;
  isSearching = false;
  isSubmitting = false;
  currentProjectId: string | null = null;

  projectStatuses = ['In Progress', 'On Hold', 'Completed', 'Killed'];

  private loadedLookupSnapshotLower: string | null = null;
  private pendingPickSearchMode: 'code' | 'name' | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private projectService: ProjectService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.projectStatusForm = this.fb.group({
      projectLookup: [''],
      projectCode: ['', Validators.required],
      projectName: [''],
      projectStatus: ['', Validators.required],
      projectVisibility: ['Active', Validators.required],
    });

    this.projectStatusForm.get('projectLookup')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const snap = this.loadedLookupSnapshotLower;
      if (snap == null) return;
      const q = this.projectStatusForm.get('projectLookup')?.value?.trim().toLowerCase() ?? '';
      if (this.currentProjectId && q !== snap) {
        this.resetAfterProjectContextChange();
      }
    });

    this.projectStatusForm.get('projectStatus')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((st) => {
      if (!this.currentProjectId || !st) return;
      const def = this.defaultVisibilityForStatus(st);
      this.projectStatusForm.patchValue({ projectVisibility: def }, { emitEvent: false });
    });
  }

  defaultVisibilityForStatus(status: string): 'Active' | 'Inactive' {
    return status === 'In Progress' ? 'Active' : 'Inactive';
  }

  /** Map API / DB value (any casing) to form values used in requests. */
  private visibilityFromApi(v: string | null | undefined): 'Active' | 'Inactive' {
    return String(v ?? '')
      .trim()
      .toLowerCase() === 'inactive'
      ? 'Inactive'
      : 'Active';
  }

  private resetAfterProjectContextChange(): void {
    this.currentProjectId = null;
    this.loadedLookupSnapshotLower = null;
    this.pendingPickSearchMode = null;
    this.projectStatusForm.get('projectCode')?.enable({ emitEvent: false });
    this.projectStatusForm.get('projectName')?.enable({ emitEvent: false });
    this.projectStatusForm.patchValue(
      {
        projectStatus: '',
        projectVisibility: 'Active',
        projectName: '',
        projectCode: '',
      },
      { emitEvent: false }
    );
  }

  onProjectSearchResolved(ev: ProjectResolvedEvent): void {
    const code = String(ev.row?.project_code ?? '').trim();
    if (!code) return;
    this.pendingPickSearchMode = ev.searchMode;
    const lookup =
      ev.searchMode === 'name'
        ? String(ev.row.project_name ?? '').trim()
        : code;
    this.projectStatusForm.patchValue(
      { projectCode: code, projectLookup: lookup },
      { emitEvent: false }
    );
    this.searchProject();
  }

  onSearchFromLookup(): void {
    const raw = this.projectStatusForm.get('projectLookup')?.value?.trim() ?? '';
    if (!raw) return;
    this.pendingPickSearchMode = null;
    this.projectStatusForm.patchValue({ projectCode: raw }, { emitEvent: false });
    this.searchProject();
  }

  searchProject() {
    const code = this.projectStatusForm.get('projectCode')?.value?.trim();
    if (!code) return;

    this.isSearching = true;

    this.projectService.getProjectByCode(code).subscribe({
      next: (res) => {
        const p = res.project;
        this.currentProjectId = p.project_id;
        const display =
          this.pendingPickSearchMode === 'name'
            ? String(p.project_name ?? '').trim()
            : String(p.project_code ?? code).trim();
        this.projectStatusForm.patchValue({ projectLookup: display }, { emitEvent: false });
        this.loadedLookupSnapshotLower = display.toLowerCase();
        this.pendingPickSearchMode = null;

        const st = p.project_status;
        const rawVis = p.project_visibility;
        const vis =
          rawVis != null && String(rawVis).trim() !== ''
            ? this.visibilityFromApi(rawVis)
            : this.defaultVisibilityForStatus(st);
        this.projectStatusForm.patchValue(
          {
            projectCode: String(p.project_code ?? code).trim(),
            projectStatus: st,
            projectVisibility: vis,
            projectName: p.project_name ?? '',
          },
          { emitEvent: false }
        );

        this.projectStatusForm.get('projectCode')?.disable({ emitEvent: false });
        this.projectStatusForm.get('projectName')?.disable({ emitEvent: false });

        this.isSearching = false;
        this.toast.info('Project found.');
      },
      error: (err: any) => {
        this.isSearching = false;
        this.currentProjectId = null;
        this.loadedLookupSnapshotLower = null;
        this.pendingPickSearchMode = null;
        this.projectStatusForm.get('projectCode')?.enable({ emitEvent: false });
        this.projectStatusForm.get('projectName')?.enable({ emitEvent: false });
        this.projectStatusForm.patchValue(
          {
            projectCode: '',
            projectLookup: '',
            projectStatus: '',
            projectVisibility: 'Active',
            projectName: '',
          },
          { emitEvent: false }
        );
        this.handleError(err);
      }
    });
  }

  setProjectVisibility(value: 'Active' | 'Inactive'): void {
    this.projectStatusForm.patchValue({ projectVisibility: value });
  }

  onSubmit() {
    if (this.projectStatusForm.invalid) {
      this.projectStatusForm.markAllAsTouched();
      return;
    }

    if (!this.currentProjectId) {
      this.toast.warning('Please search for a project first.');
      return;
    }

    this.isSubmitting = true;

    const vis = this.projectStatusForm.get('projectVisibility')?.value as 'Active' | 'Inactive';

    const payload = {
      project_id: this.currentProjectId,
      status: this.projectStatusForm.get('projectStatus')?.value,
      project_visibility: vis,
    };

    this.projectService.changeProjectStatus(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toast.success(`Project updated to '${res.project.project_status}' - Visibility: ${res.project.project_visibility}`);
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
        this.toast.warning(err.error?.error || 'Invalid data.');
        break;
      case 401:
        this.toast.error('Session expired, please login again.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('You do not have the permissions to modify this project.');
        break;
      case 404:
        this.toast.error('Project not found.');
        break;
      case 500:
        this.toast.error('Internal server error, please try again later.');
        break;
      default:
        this.toast.error('Something went wrong, please try again later');
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
