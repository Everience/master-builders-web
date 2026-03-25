import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/project/user.service';
import { ToastService } from '../../../services/project/toast.service';

@Component({
  selector: 'app-update-user-status-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-user-status-form.component.html',
  styleUrl: './update-user-status-form.component.scss'
})
export class UpdateUserStatusFormComponent {
  userStatusForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private toast: ToastService
  ) {
    this.userStatusForm = this.fb.group({
      userID:     ['', Validators.required],
      userStatus: ['', Validators.required],
    });
  }
    
  onSubmit() {
    if (this.userStatusForm.invalid) {
      this.userStatusForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const { userID, userStatus } = this.userStatusForm.value;

    //capitalize to match what BE expects: 'Active' or 'Inactive'
    const status = userStatus.charAt(0).toUpperCase() + userStatus.slice(1) as 'Active' | 'Inactive';

    this.userService.changeUserStatus(userID, status).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(`Utente ${status === 'Active' ? 'attivato' : 'disattivato'} con successo!`);
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
        this.toast.error('Non hai i permessi per modificare lo stato utente.');
        break;
      case 404:
        this.toast.error('Utente non trovato.');
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
