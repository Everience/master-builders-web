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
  submitError: string | null = null;
  submitSuccess = false;

  constructor(private fb: FormBuilder, private router: Router, private projectService: ProjectService) {
    this.votingForm = this.fb.group({
      team:          ['', Validators.required],
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

    this.votingForm.patchValue({
      projectStatus:  match.project_status,
      innovationArea: match.Innovation_area,
      region:         match.region,
      marketSegment:  match.market_segment,
      projectDocs:    match.attachments_link,
    }, { emitEvent: false });

    // Lock autofilled fields
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
      //TODO: here we need to get the userid from Microsoft 
      user_id:         '4B2A7E1C-5D38-4F92-B061-F8A2D3C4E5B6', 
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
        this.submitError = err.error?.error || 'Something went wrong. Please try again.';
      }
    });
  }

}
