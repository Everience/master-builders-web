import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environments';
import { MsalService } from '@azure/msal-angular';

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = environment.azureFunctions.baseUrl;
  private key = environment.azureFunctions.hostKey;

  constructor(private http: HttpClient, private msalService: MsalService) {}

  private getAuthHeaders(): Observable<HttpHeaders> {
    const account = this.msalService.instance.getActiveAccount();
    return from(
      this.msalService.instance.acquireTokenSilent({
        scopes: environment.msal.scopes,
        account: account!
      })
    ).pipe(
      switchMap(result => {
        return [new HttpHeaders({ 'Authorization': `Bearer ${result.accessToken}` })];
      })
    );
  }

  getAllUsers(): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.get(`${this.baseUrl}/GetAllUsers`, {
        headers,
        params: { code: this.key }
      }))
    );
  }

  changeUserStatus(payload: {
    email: string;
    department: string;
    status: 'Active' | 'Inactive';
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.put(  // ✅ PUT not POST
        `${this.baseUrl}/ChangeUserStatus`,
        payload,
        { headers, params: { code: this.key } }
      ))
    );
  }

  changeUserDepartment(payload: {
    email: string;
    department: string;
    new_department: string;
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.put(
        `${this.baseUrl}/ChangeUserDepartment`,
        payload,
        { headers, params: { code: this.key } }
      ))
    );
  }

  createUser(payload: {
    email: string;
    user_name: string;
    department: string;
    role: string;
    status: 'Active' | 'Inactive';
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post(
        `${this.baseUrl}/CreateUser`,
        payload,
        { headers, params: { code: this.key } }
      ))
    );
  }
}
