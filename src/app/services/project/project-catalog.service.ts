import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ProjectService } from './project.service';

@Injectable({ providedIn: 'root' })
export class ProjectCatalogService {
  private readonly projectService = inject(ProjectService);

  private readonly projects$ = this.projectService.getProjects().pipe(
    map((res: any) => (Array.isArray(res) ? res : res?.projects) || []),
    catchError(() => of<any[]>([])),
    shareReplay({ bufferSize: 1, refCount: false })
  );


  private votableCache$: Observable<any[]> | null = null;

  getProjects(): Observable<any[]> {
    return this.projects$;
  }

  getVotableProjects(email: string): Observable<any[]> {
    if (!this.votableCache$) {
      this.votableCache$ = this.projectService.getProjectsVotable(email).pipe(
        map((res: any) => (Array.isArray(res) ? res : res?.projects) || []),
        catchError(() => of<any[]>([])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.votableCache$;
  }
}
