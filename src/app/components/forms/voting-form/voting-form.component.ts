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
import { AuthService } from '../../../services/project/auth.service';

@Component({
  selector: 'app-voting-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voting-form.component.html',
  styleUrl: './voting-form.component.scss',
})
export class VotingFormComponent implements OnInit {
  votingForm: FormGroup;

  teams = ['Marketing', 'Sviluppo'];
  projectStatuses = ['In Progress', 'On Hold', 'Completed'];
  innovationAreas = [
    'Advanced rheology',
    'Stength development',
    'Durability',
    'Sustainability',
    'Cost efficiency',
    'Growth',
  ];
  regions = ['AMET', 'ANZ', 'EU', 'GLOBAL', 'BA', 'SA'];
  marketSegments = ['AS', 'CA', 'CS', 'FIBERS', 'UGC', 'VTG'];
  scores = [1, 2, 3, 4, 5];

  allProjects: any[] = [];
  private currentProjectId: string | null = null;
  isSubmitting = false;
  isLoadingProjects = false;
  isSearching = false;
  submitError: string | null = null;
  submitSuccess = false;
  projectDocsLink: string = ''; 

  constructor(private fb: FormBuilder, private router: Router, private projectService: ProjectService, private toast: ToastService, private authService: AuthService) {
    this.votingForm = this.fb.group({
      projectName:   ['', Validators.required],  
      projectStatus: [''],                        
      innovationArea:[''],                        
      region:        [''],                        
      marketSegment: [''],                       
      projectDocs:   [''],                        
      notes:         [''],
      score:         ['', Validators.required],
      scoreReason:   ['', Validators.required],
    });
  }
  
  ngOnInit() {
    this.loadAllProjects();
  }

  loadAllProjects() {
    this.isLoadingProjects = true;
    this.projectService.getProjects().subscribe({
      next: (res) => {
        this.allProjects = res.projects || res;
        this.isLoadingProjects = false;
        console.log(this.allProjects)
      },
      error: (err) => {
        console.error('Error fetching projects:', err);
        this.isLoadingProjects = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  onProjectSelected(event: Event) {
    const selectedName = (event.target as HTMLSelectElement).value;
    const match = this.allProjects.find(p => p.project_name === selectedName);

    if (!match) {
      this.currentProjectId = null;
      this.clearProjectFields();
      return;
    }

    this.currentProjectId = match.project_id;
    this.projectDocsLink = match.attachments_link || '';

    this.votingForm.patchValue({
      projectStatus:  match.project_status,
      innovationArea: match.Innovation_area,
      region:         match.region,
      marketSegment:  match.market_segment,
      projectDocs:    match.attachments_link,
    }, { emitEvent: false });

    ['projectStatus', 'innovationArea', 'region', 'marketSegment', 'projectDocs']
      .forEach(field => this.votingForm.get(field)!.disable({ emitEvent: false }));
  }

  clearProjectFields() {
    ['projectStatus', 'innovationArea', 'region', 'marketSegment', 'projectDocs']
      .forEach(field => this.votingForm.get(field)!.enable({ emitEvent: false }));

    this.votingForm.patchValue({
      projectStatus:  '',
      innovationArea: '',
      region:         '',
      marketSegment:  '',
      projectDocs:    '',
    }, { emitEvent: false });
  }
  
  onSubmit() {
    if (this.votingForm.invalid) {
      this.votingForm.markAllAsTouched();
      return;
    }

    if (!this.currentProjectId) {
      this.submitError = 'Please select a valid project.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    const payload = {
      project_id:      this.currentProjectId,
      score:           Number(this.votingForm.get('score')?.value),
      score_reasoning: this.votingForm.get('scoreReason')?.value,
    };

    this.projectService.voteProject(payload).subscribe({
      next: () => {
        console.log(payload)
        this.isSubmitting = false;
        this.submitSuccess = true;
        setTimeout(() => this.router.navigate(['/home']), 2000);
      },
      error: (err) => {
        console.log(payload)
        this.isSubmitting = false;
        this.handleError(err);
      }
    });
  }

  private handleError(err: any) {
    switch (err.status) {
      case 400:
        this.toast.warning(err.error?.error === 'Voting closed'
          ? 'Il progetto non è aperto al voto.'
          : 'Dati non validi. Controlla i campi.');
        break;
      case 401:
        this.toast.error('Sessione scaduta. Effettua di nuovo il login.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('Non hai i permessi per votare.');
        break;
      case 404:
        this.toast.error('Progetto non trovato.');
        break;
      case 409:
        this.toast.error('Hai già votato per questo progetto.');
        break;
      case 500:
        this.toast.error('Errore interno al server. Riprova più tardi.');
        break;
      default:
        this.toast.error('Qualcosa è andato storto. Riprova.');
    }
  }

}
