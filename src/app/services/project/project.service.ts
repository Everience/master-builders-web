import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environments';
import { MsalService } from '@azure/msal-angular';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  constructor(private http: HttpClient, private msalService: MsalService) {}

  private baseUrl = environment.azureFunctions.baseUrl;
  private key = environment.azureFunctions.hostKey;

  private getAuthHeaders(): Observable<HttpHeaders> {
    const account = this.msalService.instance.getActiveAccount();
    return from(
      this.msalService.instance.acquireTokenSilent({
        scopes: environment.msal.scopes,
        account: account!,
        forceRefresh: true
      })
    ).pipe(
      switchMap(result => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${result.accessToken}`
        });
        return [headers];
      })
    );
  }

  getProjectByCode(projectCode: string): Observable<any> {
  return this.getAuthHeaders().pipe(
    switchMap(headers => this.http.get(`${this.baseUrl}/GetProjectByCode`, {
      headers,
      params: { project_code: projectCode, code: this.key }
      }))
    );
  }

  getProjects(): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.get(`${this.baseUrl}/GetProjects`, {
        headers,
        params: { code: this.key }
      }))
    );
  }

  voteProject(payload: {
    project_id: string;
    score: number;
    score_reasoning: string;
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post(`${this.baseUrl}/VoteProject`, payload, {
        headers,
        params: { code: this.key }
      }))
    );
  }

  createProjectWithFiles(formData: FormData): Observable<any> {
  return this.getAuthHeaders().pipe(
    switchMap(headers => this.http.post(
      `${this.baseUrl}/CreateProjectFilesSP`,
      formData,
      {
        headers,
        params: { code: this.key }
      }
    ))
  );
}

  createProject(payload: {
    project_name: string;
    project_code: string;
    region: string;
    market_segment: string;
    project_phase: string;
    project_status: string;
    notes: string;
    attachments_link: string;
    project_visibility: string;
    innovation_area: string;
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post(
        `${this.baseUrl}/CreateProject`,
        payload,
        { headers, params: { code: this.key } }
      ))
    );
  }

updateProjectWithFiles(formData: FormData): Observable<any> {
  return this.getAuthHeaders().pipe(
    switchMap(headers => this.http.post(
      `${this.baseUrl}/UpdateProjectFilesSP`,
      formData,
      { headers, params: { code: this.key } }
    ))
  );
}
  
updateProject(payload: {
    old_project_id: string;
    project_name: string;
    project_code: string;
    region: string;
    market_segment: string;
    project_phase: string;
    project_status: string;
    notes: string;
    attachments_link: string;
    project_visibility: string;
    innovation_area: string;
  }): Observable<any> {
  return this.getAuthHeaders().pipe(
    switchMap(headers => this.http.post(
      `${this.baseUrl}/UpdateProject`,
      payload,
      { headers, params: { code: this.key } }
    ))
  );
}

  changeProjectStatus(payload: {
    project_id: string;
    status: string;
    project_visibility?: 'Active' | 'Inactive';
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post(
        `${this.baseUrl}/ChangeProjectStatus`,
        payload,
        { headers, params: { code: this.key } }
      ))
    );
  }

  getProjectsVotable(email: string): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.get(`${this.baseUrl}/GetProjectsVotable`, {
        headers,
        params: { code: this.key, email } 
      }))
    );
  }

}