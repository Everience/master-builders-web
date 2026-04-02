import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environments';
import { from, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private msalService: MsalService) {}

  getAccount() {
    return this.msalService.instance.getActiveAccount();
  }

  getUserName(): string {
    return this.getAccount()?.name || '';
  }

  getUserEmail(): string {
    return this.getAccount()?.username || '';
  }

  getUserId(): string {
    return this.getAccount()?.localAccountId || '';
  }

  getRoles(): Observable<string[]> {
    return from(
      this.msalService.instance.acquireTokenSilent({
        scopes: environment.msal.scopes,
        account: this.getAccount()!
      })
    ).pipe(
      map(result => {
        const claims = JSON.parse(atob(result.accessToken.split('.')[1]));
        return claims.roles || [];
      }),
      catchError(() => of([]))
    );
  }

  isAdmin(): Observable<boolean> {
    return this.getRoles().pipe(
      map(roles => roles.includes('admin'))
    );
  }

  isLoggedIn(): boolean {
    return !!this.getAccount();
  }
}