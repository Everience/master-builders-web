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

  getProjects(): Observable<any[]> {
    return this.projects$;
  }
}
