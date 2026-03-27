import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/project/user.service';
import { ToastService } from '../../../services/project/toast.service';
import { concatMap, of } from 'rxjs';

@Component({
  selector: 'app-update-user-status-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-user-status-form.component.html',
  styleUrl: './update-user-status-form.component.scss'
})
export class UpdateUserStatusFormComponent {
  userStatusForm!: FormGroup;
  isSubmitting = false;
  isSearching = false;
  matchedUsers: any[] = [];
  currentUser: any = null;
  departments = ['Board', 'Marketing', 'Technical Managers', 'R&D'];

  constructor(private fb: FormBuilder, private router: Router, private userService: UserService, private toast: ToastService) {}

  ngOnInit() {
    this.userStatusForm = this.fb.group({
      userEmail:   ['', [Validators.required, Validators.email]],
      selectedRow:   [''],
      newDepartment: ['', Validators.required],
      userStatus:  ['', Validators.required],
    });
  }
    
  searchUser() {
    const email = this.userStatusForm.get('userEmail')?.value?.trim().toLowerCase();
    if (!email) return;

    this.isSearching = true;
    this.matchedUsers = [];
    this.currentUser = null;
    this.clearUserFields();

    this.userService.getAllUsers().subscribe({
      next: (res) => {
        const users = res.users || [];
        this.matchedUsers = users.filter((u: any) => u.email?.toLowerCase() === email);

        if (this.matchedUsers.length === 0) {
          this.toast.error('Nessun utente trovato con questa email.');
          this.isSearching = false;
          return;
        }

        // if only one row, auto-select it
        if (this.matchedUsers.length === 1) {
          this.selectUser(this.matchedUsers[0]);
        } else {
          this.toast.info(`Trovati ${this.matchedUsers.length} record per questa email. Seleziona il dipartimento.`);
        }

        this.isSearching = false;
      },
      error: (err: any) => {
        this.isSearching = false;
        this.handleError(err);
      }
    });
  }

  selectUser(user: any) {
    this.currentUser = user;

    this.userStatusForm.patchValue({
      selectedRow:   user.department,
      newDepartment: user.department,
      userStatus:    user.user_status?.toLowerCase() === 'active' ? 'active' : 'inactive',
    }, { emitEvent: false });
  }

  onRowSelected(event: Event) {
    const dept = (event.target as HTMLSelectElement).value;
    const match = this.matchedUsers.find((u: any) => u.department === dept);
    if (match) this.selectUser(match);
  }

  clearUserFields() {
    this.userStatusForm.patchValue({
      selectedRow:   '',
      newDepartment: '',
      userStatus:    '',
    }, { emitEvent: false });
  }

  onSubmit() {
    if (this.userStatusForm.invalid) {
      this.userStatusForm.markAllAsTouched();
      return;
    }

    if (!this.currentUser) {
      this.toast.warning('Cerca prima un utente tramite email.');
      return;
    }

    const { newDepartment, userStatus } = this.userStatusForm.value;
    const status = (userStatus.charAt(0).toUpperCase() + userStatus.slice(1)) as 'Active' | 'Inactive';

    const departmentChanged = newDepartment !== this.currentUser.department;
    const statusChanged = status !== this.currentUser.user_status;

    if (!departmentChanged && !statusChanged) {
      this.toast.info('Nessuna modifica rilevata.');
      return;
    }

    this.isSubmitting = true;

    // ✅ chain calls: department first, then status
    const deptCall$ = departmentChanged
      ? this.userService.changeUserDepartment({
          email:          this.currentUser.email,
          department:     this.currentUser.department,
          new_department: newDepartment,
        })
      : of(null);

    deptCall$.pipe(
      concatMap(() => {
        if (statusChanged) {
          // after dept change, the email is now in new_department
          const deptForStatus = departmentChanged ? newDepartment : this.currentUser.department;
          return this.userService.changeUserStatus({
            email:      this.currentUser.email,
            department: deptForStatus,
            status,
          });
        }
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        const msg = [
          departmentChanged ? `dipartimento → ${newDepartment}` : null,
          statusChanged ? `stato → ${status}` : null,
        ].filter(Boolean).join(', ');
        this.toast.success(`Utente aggiornato: ${msg}`);
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
