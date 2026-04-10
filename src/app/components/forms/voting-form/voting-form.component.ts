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
import { ToastService } from '../../../services/project/toast.service';

@Component({
  selector: 'app-voting-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voting-form.component.html',
  styleUrl: './voting-form.component.scss',
})

export class VotingFormComponent implements OnInit {
  votingForm: FormGroup;

  scores = [1, 2, 3, 4, 5];
  allProjects: any[] = [];
  private currentProjectId: string | null = null;
  isSubmitting = false;
  isLoadingProjects = false;
  projectDocsLink: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private projectService: ProjectService,
    private toast: ToastService
  ) {
    this.votingForm = this.fb.group({
      projectName:    ['', Validators.required],
      projectStatus:  [''],
      innovationArea: [''],
      region:         [''],
      marketSegment:  [''],
      notes:          [''],
      score:          ['', Validators.required],
      scoreReason:    ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadAllProjects();
  }

  loadAllProjects() {
    this.isLoadingProjects = true;
    this.projectService.getProjects().subscribe({
      next: (res) => {
        const projects = res.projects || res;

        //filter: only In Progress + active visibility
        this.allProjects = projects.filter((p: any) =>
          p.project_status === 'In Progress' &&
          p.project_visibility?.toLowerCase() === 'active'
        );

        console.log(this.allProjects)
        this.isLoadingProjects = false;

        //toast if no votable projects
        if (this.allProjects.length === 0) {
          this.toast.info('No active projects available to vote.');
        }
      },
      error: (err: any) => {
        this.isLoadingProjects = false;
        this.toast.error('Error loading projects. Please try again.');
      }
    });
  }

  onProjectSelected(event: Event) {
  const selectedId = (event.target as HTMLSelectElement).value;
  const match = this.allProjects.find((p: any) => p.project_id === selectedId); // ✅

  if (!match) {
    this.currentProjectId = null;
    this.projectDocsLink = '';
    this.clearProjectFields();
    return;
  }

  this.currentProjectId = match.project_id;
  this.projectDocsLink = match.attachments_link || '';

  this.votingForm.patchValue({
    projectName:    match.project_name,  // ✅ still shows the name in the form
    projectStatus:  match.project_status,
    innovationArea: match.innovation_area,
    region:         match.region,
    marketSegment:  match.market_segment,
    notes:          match.notes,
  }, { emitEvent: false });

  ['projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes']
    .forEach(field => this.votingForm.get(field)!.disable({ emitEvent: false }));
}
  clearProjectFields() {
    ['projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes']
      .forEach(field => this.votingForm.get(field)!.enable({ emitEvent: false }));

    this.votingForm.patchValue({
      projectStatus:  '',
      innovationArea: '',
      region:         '',
      marketSegment:  '',
      notes:          '',
    }, { emitEvent: false });
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
      project_id:      this.currentProjectId,
      score:           Number(this.votingForm.get('score')?.value),
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
      }
    });
  }

  private handleError(err: any) {
    switch (err.status) {
      case 400:
        this.toast.warning(err.error?.error === 'Voting closed'
          ? 'This project is not open for voting.'
          : 'Invalid data. Please check the fields.');
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
        this.toast.error(err.error?.error === 'User con piu department attivi'
          ? 'Your account is active in multiple departments. Please contact an administrator.'
          : 'You have already voted for this project.');
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