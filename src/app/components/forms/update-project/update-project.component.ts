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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, filter } from 'rxjs/operators';


@Component({
  selector: 'app-update-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-project.component.html',
  styleUrl: './update-project.component.scss'
})
export class UpdateProjectComponent implements OnInit {
  private destroy$ = new Subject<void>();
  projectForm!: FormGroup;
  uploadedFiles: File[] = [];
  isSearching = false;

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

  constructor(private fb: FormBuilder, private router: Router, private projectService: ProjectService) {
    
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
      attachments:    [null],
    });
  }

  searchProject() {
    const code = this.projectForm.get('projectCode')?.value?.trim();
    if (!code) return;

    this.isSearching = true;

    this.projectService.getProjectByCode(code).subscribe({
      next: (res) => {
        const p = res.project;
        this.projectForm.patchValue({
          projectName:    p.project_name,
          projectStatus:  p.project_status,
          innovationArea: p.Innovation_area,
          region:         p.region,
          marketSegment:  p.market_segment,
          notes:          p.notes,
          projectPhase:   p.project_phase,
        }, { emitEvent: false });

        ['projectName', 'projectStatus', 'innovationArea', 'region', 'marketSegment', 'notes', 'projectPhase']
          .forEach(field => this.projectForm.get(field)!.disable({ emitEvent: false }));

        this.isSearching = false;
      },
      error: (err) => {
        console.error('Project not found:', err);
        this.clearAutofilledFields();
        this.isSearching = false;
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
    }, { emitEvent: false });
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
    this.getAllProjects();
    this.getProjectData();
  }

  onSubmit() {
    if (this.projectForm.valid) {
      console.log('Form Data:', this.projectForm.value);
      console.log('Uploaded Files:', this.uploadedFiles);
      alert('Form submitted successfully!');
    } else {
      this.projectForm.markAllAsTouched();
    }
  }

  loadProject() {
    this.projectService.getProjectById(123).subscribe({
      next: (res) => {
        console.log(res.project);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  getProjectData() {
    this.projectService.getProjectByCode('EBA05').subscribe({
      next: (res) => {
        console.log(res.project);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  getAllProjects() {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        console.log('Projects:', res.projects || res); 
      },
      error: (err) => {
        console.error('Error fetching projects:', err);
      }
    });
  }
}
