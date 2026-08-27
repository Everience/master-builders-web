import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/project/user.service';
import { ToastService } from '../../../services/project/toast.service';

type Mode = 'manage' | 'create';
type Status = 'Active' | 'Inactive';
type CellState = 'active' | 'inactive' | 'none';

interface UserRecord {
  user_id_internal: string;
  user_name: string;
  email: string;
  department: string;
  role: string;
  user_status: string;
}

interface DeptCell {
  department: string;
  state: CellState;
  record: UserRecord | null;
}

interface EmailSuggestion {
  email: string;
  user_name: string;
}

@Component({
  selector: 'app-update-user-status-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './update-user-status-form.component.html',
  styleUrl: './update-user-status-form.component.scss',
})
export class UpdateUserStatusFormComponent implements OnInit {
  mode: Mode = 'manage';

  readonly departments = ['Board', 'Marketing', 'Technical Managers', 'R&D'];
  readonly roles = ['Admin', 'User'];
  readonly emailMaxSuggestions = 10;

  searchForm!: FormGroup;
  createForm!: FormGroup;

  isSearching = false;
  hasSearched = false;
  searchedEmail = '';
  records: UserRecord[] = [];

  busyDept: string | null = null;
  isCreating = false;

  private allUsers: UserRecord[] = [];
  private emailCatalog: EmailSuggestion[] = [];
  catalogLoading = false;
  catalogReady = false;

  emailSuggestions: EmailSuggestion[] = [];
  showEmailSuggestions = false;
  emailActiveIndex = -1;
  private emailBlurTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.createForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      user_name: ['', [Validators.required, Validators.minLength(2)]],
      department: ['', Validators.required],
      role: ['User', Validators.required],
    });

    this.loadCatalog();
  }

  setMode(m: Mode): void {
    if (this.mode === m) return;
    this.mode = m;
  }

  isActive(r: UserRecord): boolean {
    return String(r.user_status || '').trim().toLowerCase() === 'active';
  }

  get activeRecord(): UserRecord | null {
    return this.records.find(r => this.isActive(r)) ?? null;
  }

  get displayUserName(): string {
    if (!this.records.length) return '';
    const active = this.activeRecord;
    return (active?.user_name || this.records[0].user_name || '').trim();
  }

  get displayEmail(): string {
    if (!this.records.length) return this.searchedEmail;
    return (this.records[0].email || this.searchedEmail).trim();
  }

  get displayRole(): string {
    for (const r of this.records) {
      const role = String(r.role || '').trim();
      if (role) return this.formatRole(role);
    }
    return this.formatRole('User');
  }

  get activeDeptLabel(): string {
    const a = this.activeRecord;
    return a ? this.canonicalDept(a.department) : 'No active department';
  }

  get hasActiveDept(): boolean {
    return !!this.activeRecord;
  }

  get deptCells(): DeptCell[] {
    return this.departments.map(d => {
      const rec = this.records.find(r => this.sameDept(r.department, d)) || null;
      const state: CellState = rec ? (this.isActive(rec) ? 'active' : 'inactive') : 'none';
      return { department: d, state, record: rec };
    });
  }

  private sameDept(a: string | null | undefined, b: string | null | undefined): boolean {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  private canonicalDept(raw: string | null | undefined): string {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) return '';
    const match = this.departments.find(d => d.toLowerCase() === v);
    return match || String(raw);
  }

  formatRole(role: string | null | undefined): string {
    const r = String(role || '').trim();
    if (!r) return 'User';
    return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  }

  trackByDept = (_i: number, c: DeptCell): string => c.department;
  trackByEmail = (_i: number, s: EmailSuggestion): string => s.email.toLowerCase();

  private loadCatalog(): void {
    if (this.catalogLoading) return;
    this.catalogLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (res) => {
        this.allUsers = res?.users || [];
        this.rebuildEmailCatalog();
        this.catalogReady = true;
        this.catalogLoading = false;
        if (this.showEmailSuggestions) this.refreshEmailSuggestions();
      },
      error: () => {
        this.catalogLoading = false;
      },
    });
  }

  private rebuildEmailCatalog(): void {
    const map = new Map<string, EmailSuggestion>();
    for (const u of this.allUsers) {
      const email = String(u.email || '').trim();
      if (!email) continue;
      const k = email.toLowerCase();
      const prev = map.get(k);
      const name = String(u.user_name || '').trim();
      if (!prev || (!prev.user_name && name)) {
        map.set(k, { email, user_name: name });
      }
    }
    this.emailCatalog = Array.from(map.values()).sort((a, b) =>
      a.email.toLowerCase().localeCompare(b.email.toLowerCase())
    );
  }

  refreshEmailSuggestions(): void {
    const raw = String(this.searchForm?.value?.email ?? '').trim();
    const q = raw.toLowerCase();
    if (!q) {
      this.emailSuggestions = [];
      this.emailActiveIndex = -1;
      return;
    }
    const starts: EmailSuggestion[] = [];
    const contains: EmailSuggestion[] = [];
    for (const e of this.emailCatalog) {
      const el = e.email.toLowerCase();
      if (el.startsWith(q)) starts.push(e);
      else if (el.includes(q) || e.user_name.toLowerCase().includes(q)) contains.push(e);
    }
    this.emailSuggestions = [...starts, ...contains].slice(0, this.emailMaxSuggestions);
    if (this.emailActiveIndex >= this.emailSuggestions.length) {
      this.emailActiveIndex = this.emailSuggestions.length ? this.emailSuggestions.length - 1 : -1;
    }
  }

  private clearEmailBlurTimer(): void {
    if (this.emailBlurTimer != null) {
      clearTimeout(this.emailBlurTimer);
      this.emailBlurTimer = null;
    }
  }

  onEmailFocus(): void {
    this.clearEmailBlurTimer();
    if (!this.catalogReady && !this.catalogLoading) this.loadCatalog();
    this.showEmailSuggestions = true;
    this.refreshEmailSuggestions();
  }

  onEmailBlur(): void {
    this.clearEmailBlurTimer();
    this.emailBlurTimer = setTimeout(() => {
      this.showEmailSuggestions = false;
      this.emailActiveIndex = -1;
      this.emailBlurTimer = null;
    }, 180);
  }

  onEmailKeydown(ev: KeyboardEvent): void {
    const panelOpen = this.showEmailSuggestions && this.emailSuggestions.length > 0;

    if (ev.key === 'ArrowDown' && panelOpen) {
      ev.preventDefault();
      this.emailActiveIndex = Math.min(this.emailActiveIndex + 1, this.emailSuggestions.length - 1);
      return;
    }
    if (ev.key === 'ArrowUp' && panelOpen) {
      ev.preventDefault();
      this.emailActiveIndex = Math.max(this.emailActiveIndex - 1, -1);
      return;
    }
    if (ev.key === 'Escape' && this.showEmailSuggestions) {
      ev.preventDefault();
      this.showEmailSuggestions = false;
      this.emailActiveIndex = -1;
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      if (panelOpen && this.emailActiveIndex >= 0) {
        this.selectEmail(this.emailSuggestions[this.emailActiveIndex]);
        return;
      }
      this.searchUsers();
    }
  }

  selectEmail(item: EmailSuggestion, ev?: MouseEvent): void {
    if (ev) ev.preventDefault();
    this.clearEmailBlurTimer();
    this.searchForm.patchValue({ email: item.email }, { emitEvent: false });
    this.showEmailSuggestions = false;
    this.emailActiveIndex = -1;
    this.searchUsers();
  }

  searchUsers(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const email = (this.searchForm.value.email || '').trim().toLowerCase();
    if (!email) return;

    this.showEmailSuggestions = false;
    this.isSearching = true;
    this.hasSearched = false;

    this.userService.getAllUsers().subscribe({
      next: (res) => {
        this.allUsers = res?.users || [];
        this.rebuildEmailCatalog();
        this.catalogReady = true;
        this.records = this.allUsers.filter((u: any) => (u.email || '').toLowerCase() === email);
        this.searchedEmail = email;
        this.hasSearched = true;
        this.isSearching = false;

        if (!this.records.length) {
          this.toast.info('No user found with this email.');
        }
      },
      error: (err: any) => {
        this.isSearching = false;
        this.handleError(err);
      },
    });
  }

  onEmailChanged(): void {
    if (this.hasSearched) {
      this.hasSearched = false;
      this.records = [];
    }
    this.showEmailSuggestions = true;
    this.emailActiveIndex = -1;
    this.refreshEmailSuggestions();
  }

  refreshRecords(onDone?: () => void): void {
    const email = this.searchedEmail;
    if (!email) {
      onDone?.();
      return;
    }
    this.userService.getAllUsers().subscribe({
      next: (res) => {
        this.allUsers = res?.users || [];
        this.rebuildEmailCatalog();
        this.records = this.allUsers.filter((u: any) => (u.email || '').toLowerCase() === email);
        onDone?.();
      },
      error: (err: any) => {
        this.handleError(err);
        onDone?.();
      },
    });
  }

  activate(cell: DeptCell): void {
    if (!cell.record) return;
    this.setStatus(cell, 'Active');
  }

  deactivate(cell: DeptCell): void {
    if (!cell.record) return;
    this.setStatus(cell, 'Inactive');
  }

  private setStatus(cell: DeptCell, status: Status): void {
    if (this.busyDept) return;
    const rec = cell.record;
    if (!rec) return;
    if ((this.isActive(rec) && status === 'Active') || (!this.isActive(rec) && status === 'Inactive')) {
      return;
    }

    const previousActive = this.activeRecord;
    this.busyDept = cell.department;

    this.userService
      .changeUserStatus({ email: rec.email, department: rec.department, status })
      .subscribe({
        next: () => {
          if (status === 'Active' && previousActive && previousActive.department !== rec.department) {
            this.toast.info(`${previousActive.department} was deactivated to keep one active department.`);
          }
          this.toast.success(`${rec.department} set to ${status}.`);
          this.refreshRecords(() => (this.busyDept = null));
        },
        error: (err: any) => {
          this.busyDept = null;
          this.handleError(err);
        },
      });
  }

  assign(cell: DeptCell): void {
    if (this.busyDept) return;
    if (cell.record) return;

    const source = this.activeRecord || this.records[0];
    if (!source) return;

    this.busyDept = cell.department;

    this.userService
      .changeUserDepartment({
        email: source.email,
        department: source.department,
        new_department: cell.department,
      })
      .subscribe({
        next: () => {
          this.toast.success(`${this.displayUserName || 'User'} assigned to ${cell.department}.`);
          if (source.department !== cell.department) {
            this.toast.info(`${source.department} was deactivated.`);
          }
          this.refreshRecords(() => (this.busyDept = null));
        },
        error: (err: any) => {
          this.busyDept = null;
          this.handleError(err);
        },
      });
  }

  createUser(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const payload = {
      email: (this.createForm.value.email || '').trim(),
      user_name: (this.createForm.value.user_name || '').trim(),
      department: this.createForm.value.department,
      role: this.createForm.value.role,
      status: 'Active' as const,
    };
    this.isCreating = true;
    this.userService.createUser(payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.toast.success(`User ${payload.email} created in ${payload.department}.`);
        const keepEmail = payload.email;
        this.createForm.reset({ email: '', user_name: '', department: '', role: 'User' });
        this.searchForm.patchValue({ email: keepEmail }, { emitEvent: false });
        this.setMode('manage');
        this.searchUsers();
      },
      error: (err: any) => {
        this.isCreating = false;
        this.handleError(err);
      },
    });
  }

  private handleError(err: any): void {
    switch (err?.status) {
      case 400:
        this.toast.warning(err?.error?.error || 'Invalid data.');
        break;
      case 401:
        this.toast.error('Session expired. Please log in again.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        this.toast.error('You do not have permission for this action.');
        break;
      case 404:
        this.toast.error(err?.error?.error || 'User not found.');
        break;
      case 409:
        this.toast.error(err?.error?.error || 'Conflict: the user already exists.');
        break;
      case 500:
        this.toast.error('Internal server error. Please try again later.');
        break;
      default:
        this.toast.error('Something went wrong. Please try again.');
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
