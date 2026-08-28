import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  OnDestroy,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ProjectCatalogService } from '../../../services/project/project-catalog.service';
import { ToastService } from '../../../services/project/toast.service';
import { MsalService } from '@azure/msal-angular';

export type ProjectSearchMode = 'code' | 'name';

export interface ProjectResolvedEvent {
  row: any;
  searchMode: ProjectSearchMode;
}

@Component({
  selector: 'app-project-search-autocomplete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-search-autocomplete.component.html',
  styleUrl: './project-search-autocomplete.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ProjectSearchAutocompleteComponent),
      multi: true,
    },
  ],
})
export class ProjectSearchAutocompleteComponent
  implements ControlValueAccessor, OnDestroy
{
  @Input() filterVotableOnly = false;
  @Input() searchButtonBusy = false;
  @Input() resolveSearchLocally = false;

  @Output() searchActivate = new EventEmitter<void>();
  @Output() projectResolved = new EventEmitter<ProjectResolvedEvent>();
  @Output() searchModeChange = new EventEmitter<ProjectSearchMode>();

  readonly minChars = 3;
  readonly maxSuggestions = 20;

  searchMode: ProjectSearchMode = 'code';
  query = '';
  disabled = false;

  isLoading = false;
  catalogReady = false;
  loadError = false;
  private allRows: any[] = [];
  private codeDedupeRows: any[] = [];
  suggestions: any[] = [];
  showSuggestions = false;
  activeIndex = -1;
  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private catalog: ProjectCatalogService,
    private toast: ToastService,
    private msalService: MsalService
  ) {}

  get queryTrim(): string {
    return this.query.trim();
  }

  ngOnDestroy(): void {
    this.clearBlurTimer();
  }

  writeValue(obj: string | null): void {
    this.query = obj != null ? String(obj) : '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  setSearchMode(mode: ProjectSearchMode): void {
    if (this.searchMode === mode) return;
    this.searchMode = mode;
    this.activeIndex = -1;
    this.refreshSuggestions();
    this.searchModeChange.emit(this.searchMode);
  }

  private clearBlurTimer(): void {
    if (this.blurTimer != null) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
  }

  private filterCatalogRows(raw: any[]): any[] {
    if (!this.filterVotableOnly) return raw;
    return raw.filter(
      (p: any) =>
        p.project_status.toLowerCase() === 'in progress' &&
        String(p.project_visibility || '').toLowerCase() === 'active'
    );
  }

  private rebuildCodeDedupe(rows: any[]): void {
    const map = new Map<string, any>();
    for (const p of rows) {
      const code = String(p.project_code ?? '').trim();
      if (!code) continue;
      const k = code.toLowerCase();
      if (!map.has(k)) map.set(k, p);
    }
    this.codeDedupeRows = Array.from(map.values()).sort((a, b) =>
      String(a.project_code || '')
        .toLowerCase()
        .localeCompare(String(b.project_code || '').toLowerCase())
    );
  }

  private dedupeByProjectCode(rows: any[]): any[] {
    const map = new Map<string, any>();
    for (const r of rows) {
      const code = String(r.project_code ?? '').trim();
      if (!code) continue;
      const k = code.toLowerCase();
      if (!map.has(k)) map.set(k, r);
    }
    return Array.from(map.values());
  }

  private nameTextMatchesQuery(row: any, qLower: string): boolean {
    return String(row.project_name || '').toLowerCase().includes(qLower);
  }

  private nameMatchRank(row: any, qLower: string): number {
    const n = String(row.project_name || '').toLowerCase();
    if (n.startsWith(qLower)) return 0;
    const i = n.indexOf(qLower);
    return i < 0 ? 9999 : i + 1;
  }

  ensureCatalogLoaded(): void {
    if (this.isLoading || this.catalogReady) {
      if (this.catalogReady) this.refreshSuggestions();
      return;
    }
    this.isLoading = true;
    this.loadError = false;
    const email = this.msalService.instance.getActiveAccount()?.username ?? '';
    const source$ = this.filterVotableOnly
      ? this.catalog.getVotableProjects(email)
      : this.catalog.getProjects();
    source$.subscribe({
      next: (rows) => {
        this.allRows = this.filterCatalogRows(rows || []);
        this.rebuildCodeDedupe(this.allRows);
        this.catalogReady = true;
        this.loadError = false;
        this.isLoading = false;
        if (this.filterVotableOnly && this.allRows.length === 0) {
          this.toast.info('No active projects available to vote.');
        }
        this.refreshSuggestions();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
        this.toast.error('Could not load project list for suggestions.');
      },
    });
  }

  onFocus(): void {
    this.clearBlurTimer();
    this.ensureCatalogLoaded();
    this.showSuggestions = true;
    this.refreshSuggestions();
  }

  onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.query = v;
    this.onChange(this.query);
    this.showSuggestions = true;
    this.activeIndex = -1;
    if (this.queryTrim.length >= this.minChars) {
      this.ensureCatalogLoaded();
    }
    this.refreshSuggestions();
  }

  onBlur(): void {
    this.clearBlurTimer();
    this.blurTimer = setTimeout(() => {
      this.showSuggestions = false;
      this.activeIndex = -1;
      this.blurTimer = null;
    }, 180);
    this.onTouched();
  }

  onKeydown(ev: KeyboardEvent): void {
    const panelOpen =
      this.showSuggestions &&
      this.queryTrim.length >= this.minChars &&
      (this.suggestions.length > 0 || this.isLoading);

    if (ev.key === 'ArrowDown' && panelOpen && this.suggestions.length > 0) {
      ev.preventDefault();
      this.activeIndex = Math.min(
        this.activeIndex + 1,
        this.suggestions.length - 1
      );
      return;
    }
    if (ev.key === 'ArrowUp' && panelOpen && this.suggestions.length > 0) {
      ev.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, -1);
      return;
    }
    if (ev.key === 'Escape' && this.showSuggestions) {
      ev.preventDefault();
      this.showSuggestions = false;
      this.activeIndex = -1;
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      if (
        this.showSuggestions &&
        this.suggestions.length === 1 &&
        this.activeIndex < 0
      ) {
        this.applyRow(this.suggestions[0]);
        return;
      }
      if (
        this.showSuggestions &&
        this.suggestions.length > 0 &&
        this.activeIndex >= 0
      ) {
        this.applyRow(this.suggestions[this.activeIndex]);
        return;
      }
      if (this.searchMode === 'name' && !this.resolveSearchLocally) {
        this.tryNameEnterResolveForUpdate();
        return;
      }
      if (this.resolveSearchLocally) {
        this.tryLocalExactResolve();
      } else {
        this.searchActivate.emit();
      }
    }
  }

  private tryNameEnterResolveForUpdate(): void {
    const q = this.queryTrim.toLowerCase();
    if (q.length < this.minChars) {
      this.searchActivate.emit();
      return;
    }
    const hits = this.dedupeByProjectCode(
      this.allRows.filter((r) => this.nameTextMatchesQuery(r, q))
    );
    if (hits.length === 1) {
      this.applyRow(hits[0]);
      return;
    }
    this.searchActivate.emit();
  }

  private tryNameSearchExactDedupe(): void {
    const q = this.queryTrim.toLowerCase();
    if (!q) return;
    const hits = this.dedupeByProjectCode(
      this.allRows.filter(
        (r) => String(r.project_name || '').trim().toLowerCase() === q
      )
    );
    if (hits.length === 1) {
      this.applyRow(hits[0]);
      return;
    }
    if (hits.length === 0) {
      this.toast.warning('No project has that exact name. Pick a suggestion or refine your search.');
      return;
    }
    this.toast.warning('Pick a suggestion from the list.');
  }

  selectRow(row: any, ev: MouseEvent): void {
    ev.preventDefault();
    this.applyRow(row);
  }

  private applyRow(row: any): void {
    this.clearBlurTimer();
    this.showSuggestions = false;
    this.activeIndex = -1;
    const mode = this.searchMode;
    const display =
      mode === 'name'
        ? String(row.project_name ?? '').trim()
        : String(row.project_code ?? '').trim();
    this.query = display;
    this.onChange(this.query);
    this.projectResolved.emit({ row, searchMode: mode });
  }

  onSearchClick(): void {
    if (this.resolveSearchLocally) {
      this.tryLocalExactResolve();
      return;
    }
    if (this.searchMode === 'name') {
      this.tryNameSearchExactDedupe();
      return;
    }
    this.searchActivate.emit();
  }

  private tryLocalExactResolve(): void {
    const q = this.queryTrim;
    if (!q) return;
    this.ensureCatalogLoaded();
    if (!this.catalogReady) return;
    const rows = this.allRows;
    let hits: any[] = [];
    if (this.searchMode === 'code') {
      hits = rows.filter(
        (r) =>
          String(r.project_code || '').trim().toLowerCase() === q.toLowerCase()
      );
    } else {
      hits = this.dedupeByProjectCode(
        rows.filter(
          (r) => String(r.project_name || '').trim().toLowerCase() === q.toLowerCase()
        )
      );
    }
    if (hits.length === 1) {
      this.applyRow(hits[0]);
      return;
    }
    if (hits.length === 0) {
      this.toast.warning('No project matches exactly. Pick a suggestion or adjust your search.');
      return;
    }
    this.toast.warning('Multiple projects match. Pick a suggestion from the list.');
  }

  refreshSuggestions(): void {
    const q = this.queryTrim;
    const qLower = q.toLowerCase();
    if (q.length < this.minChars) {
      this.suggestions = [];
      this.activeIndex = -1;
      return;
    }
    if (!this.catalogReady) {
      this.suggestions = [];
      return;
    }
    if (this.searchMode === 'code') {
      this.suggestions = this.codeDedupeRows
        .filter((r) =>
          String(r.project_code || '')
            .toLowerCase()
            .startsWith(qLower)
        )
        .slice(0, this.maxSuggestions);
    } else {
      const matches = this.allRows.filter((r) =>
        this.nameTextMatchesQuery(r, qLower)
      );
      const deduped = this.dedupeByProjectCode(matches);
      deduped.sort((a, b) => {
        const ra = this.nameMatchRank(a, qLower);
        const rb = this.nameMatchRank(b, qLower);
        if (ra !== rb) return ra - rb;
        const na = String(a.project_name || '').toLowerCase();
        const nb = String(b.project_name || '').toLowerCase();
        const c = na.localeCompare(nb);
        if (c !== 0) return c;
        return String(a.project_code || '')
          .toLowerCase()
          .localeCompare(String(b.project_code || '').toLowerCase());
      });
      this.suggestions = deduped.slice(0, this.maxSuggestions);
    }
    if (this.activeIndex >= this.suggestions.length) {
      this.activeIndex = this.suggestions.length
        ? this.suggestions.length - 1
        : -1;
    }
  }

  trackRow(index: number, row: any): string {
    if (this.searchMode === 'code') {
      return `c_${String(row.project_code ?? '').toLowerCase()}_${index}`;
    }
    return `n_${String(row.project_code ?? '').toLowerCase()}_${index}`;
  }
}
