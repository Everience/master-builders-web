import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project/project.service';
import { ToastService } from '../../../services/project/toast.service';

@Component({
  selector: 'app-update-project-visibility-and status',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-form.component.html',
  styleUrl: './update-form.component.scss'
})

export class UpdateFormComponent implements OnInit {
  projectStatusForm!: FormGroup;
  isSearching = false;
  isSubmitting = false;
  currentProjectId: string | null = null;

  projectStatuses = ['In Progress', 'On Hold', 'Completed', 'Killed'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private projectService: ProjectService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.projectStatusForm = this.fb.group({
      projectCode:   ['', Validators.required],
      projectStatus: ['', Validators.required],
    });
  }

  searchProject() {
    const code = this.projectStatusForm.get('projectCode')?.value?.trim();
    if (!code) return;

    this.isSearching = true;

    this.projectService.getProjectByCode(code).subscribe({
      next: (res) => {
        const p = res.project;
        this.currentProjectId = p.project_id;

        this.projectStatusForm.patchValue({
          projectStatus: p.project_status,
        }, { emitEvent: false });

        this.isSearching = false;
        this.toast.info('Progetto trovato.');
      },
      error: (err: any) => {
        this.isSearching = false;
        this.currentProjectId = null;
        this.handleError(err);
      }
    });
  }

  onSubmit() {
    if (this.projectStatusForm.invalid) {
      this.projectStatusForm.markAllAsTouched();
      return;
    }

    if (!this.currentProjectId) {
      this.toast.warning('Cerca prima un progetto tramite il codice.');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      project_id: this.currentProjectId,
      status:     this.projectStatusForm.get('projectStatus')?.value,
    };

    this.projectService.changeProjectStatus(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toast.success(`Progetto aggiornato a '${res.project.project_status}' — visibilità: ${res.project.project_visibility}`);
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
        this.toast.warning(err.error?.error || 'Dati non validi.');
        break;
      case 401:
        this.toast.error('Sessione scaduta. Effettua di nuovo il login.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('Non hai i permessi per modificare questo progetto.');
        break;
      case 404:
        this.toast.error('Progetto non trovato.');
        break;
      case 500:
        this.toast.error('Errore interno al server. Riprova più tardi.');
        break;
      default:
        this.toast.error('Qualcosa è andato storto. Riprova.');
    }
  }

  getVisibility(): string {
    const status = this.projectStatusForm.get('projectStatus')?.value;
    const map: Record<string, string> = {
      'In Progress': 'active',
      'On Hold':     'inactive',
      'Completed':   'inactive',
      'Killed':      'inactive',
    };
    return map[status] || '';
  }

  getVisibilityLabel(): string {
    const v = this.getVisibility();
    if (v === 'active')   return '● Active';
    if (v === 'inactive') return '● Inactive';
    return '— select a status';
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
