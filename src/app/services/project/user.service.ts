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

  changeUserStatus(userId: string, status: 'Active' | 'Inactive'): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post(
        `${this.baseUrl}/ChangeUserStatusById`,
        { user_id: userId, status },
        { headers, params: { code: this.key } }
      ))
    );
  }
}