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
  selector: 'app-voting-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProjectSearchAutocompleteComponent],
  templateUrl: './voting-form.component.html',
  styleUrl: './voting-form.component.scss',
})

export class VotingFormComponent implements OnInit {
  votingForm: FormGroup;

  scores = [1, 2, 3, 4, 5];
  private currentProjectId: string | null = null;
  private loadedLookupSnapshotLower: string | null = null;
  isSubmitting = false;
  projectDocsLink: string = '';

  private readonly destroyRef = inject(DestroyRef);

  get hasSelectedProject(): boolean {
    return this.currentProjectId != null;
  }

  get currentScore(): number | null {
    const v = this.votingForm?.get('score')?.value;
    return v === '' || v == null ? null : Number(v);
  }

  setScore(n: number): void {
    this.votingForm.patchValue({ score: n });
    this.votingForm.get('score')?.markAsTouched();
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private projectService: ProjectService,
    private toast: ToastService
  ) {
    this.votingForm = this.fb.group({
      projectLookup: [''],
      projectName: [''],
      projectCode: [''],
      projectStatus: [''],
      innovationArea: [''],
      region: [''],
      marketSegment: [''],
      notes: [''],
      score: ['', Validators.required],
      scoreReason: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.votingForm.get('projectLookup')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const snap = this.loadedLookupSnapshotLower;
      if (snap == null) return;
      const q = this.votingForm.get('projectLookup')?.value?.trim().toLowerCase() ?? '';
      if (this.currentProjectId && q !== snap) {
        this.clearVotingProject();
      }
    });
  }

  onProjectLookupResolved(ev: ProjectResolvedEvent) {
    const p = ev.row;
    if (!p) return;
    this.currentProjectId = p.project_id ?? null;
    const lookup =
      ev.searchMode === 'name'
        ? String(p.project_name ?? '').trim()
        : String(p.project_code ?? '').trim();
    this.loadedLookupSnapshotLower = lookup.toLowerCase();
    this.projectDocsLink = p.attachments_link || '';

    this.votingForm.patchValue(
      {
        projectLookup: lookup,
        projectName: String(p.project_name ?? '').trim(),
        projectCode: String(p.project_code ?? '').trim(),
        projectStatus: p.project_status,
        innovationArea: p.innovation_area,
        region: p.region,
        marketSegment: p.market_segment,
        notes: p.notes,
      },
      { emitEvent: false }
    );

    ['projectName', 'projectCode', 'projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes'].forEach(
      (field) => this.votingForm.get(field)!.disable({ emitEvent: false })
    );
  }

  private clearVotingProject() {
    this.currentProjectId = null;
    this.loadedLookupSnapshotLower = null;
    this.projectDocsLink = '';
    this.clearProjectFields();
    this.votingForm.patchValue(
      { projectLookup: '', projectName: '', projectCode: '' },
      { emitEvent: false }
    );
  }

  clearProjectFields() {
    ['projectName', 'projectCode', 'projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes'].forEach(
      (field) => this.votingForm.get(field)!.enable({ emitEvent: false })
    );

    this.votingForm.patchValue(
      {
        projectStatus: '',
        innovationArea: '',
        region: '',
        marketSegment: '',
        notes: '',
      },
      { emitEvent: false }
    );
  }

  onSubmit() {
    if (this.votingForm.invalid) {
      this.votingForm.markAllAsTouched();
      return;
    }

    if (!this.currentProjectId) {
      this.toast.warning('Please select a valid project.');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      project_id: this.currentProjectId,
      score: Number(this.votingForm.get('score')?.value),
      score_reasoning: this.votingForm.get('scoreReason')?.value,
    };

    this.projectService.voteProject(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Vote submitted successfully!');
        setTimeout(() => this.router.navigate(['/home']), 2000);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.handleError(err);
      },
    });
  }

  private handleError(err: any) {
    switch (err.status) {
      case 400:
        this.toast.warning(
          err.error?.error === 'Voting closed'
            ? 'This project is not open for voting.'
            : 'Invalid data. Please check the fields.'
        );
        break;
      case 401:
        this.toast.error('Session expired. Please log in again.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('You do not have permission to vote.');
        break;
      case 404:
        this.toast.error('Project not found.');
        break;
      case 409:
        this.toast.error(
          err.error?.error === 'User con piu department attivi'
            ? 'Your account is active in multiple departments. Please contact an administrator.'
            : 'You have already voted for this project.'
        );
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
