import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private baseUrl = environment.azureFunctions.baseUrl;

  constructor(private http: HttpClient) {}

  getProjectById(projectId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetProjectById`, {
      params: {
        project_id: projectId,
        code: environment.azureFunctions.keys.GetProjectById
      }
    });
  }

  getProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetProjects`, {
      params: {
        code: environment.azureFunctions.keys.GetProjects
      }
    });
  }
}