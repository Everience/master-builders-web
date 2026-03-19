import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  constructor(private http: HttpClient) {}

  private baseUrl = environment.azureFunctions.baseUrl;
  private key = environment.azureFunctions.hostKey;

  getProjectById(projectId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetProjectById`, {
      params: { project_id: projectId, code: this.key }
    });
  }

  getProjectByCode(projectCode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetProjectByCode`, {
      params: { project_code: projectCode, code: this.key }
    });
  }

  getProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetProjects`, {
      params: { code: this.key }
    });
  }

  voteProject(payload: {project_id: string; user_id: string; score: number; score_reasoning: string;  }): Observable<any> {
        return this.http.post(`${this.baseUrl}/VoteProject`, payload, {
        params: { code: this.key } 
      });
    }
}