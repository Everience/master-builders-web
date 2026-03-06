import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, signInWithPopup, OAuthProvider } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  isLoading = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Redirect if user is already authenticated
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async signInWithMicrosoft(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const provider = new OAuthProvider('microsoft.com');

      // Optional: restrict to a specific tenant
      // provider.setCustomParameters({ tenant: 'YOUR_TENANT_ID' });

      // Request additional scopes if needed
      provider.addScope('User.Read');

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      console.log('Signed in as:', user.displayName, user.email);

      // Navigate to dashboard after successful login
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      this.errorMessage = this.getFriendlyError(error.code ?? error.message);
    } finally {
      this.isLoading = false;
    }
  }

  private getFriendlyError(code: string): string {
    const messages: Record<string, string> = {
      'auth/popup-closed-by-user':       'Sign-in was cancelled. Please try again.',
      'auth/popup-blocked':              'Pop-up was blocked by your browser. Please allow pop-ups and retry.',
      'auth/account-exists-with-different-credential':
                                         'An account already exists with a different sign-in method.',
      'auth/network-request-failed':     'Network error. Please check your connection and try again.',
      'auth/cancelled-popup-request':    'Another sign-in is already in progress.',
      'auth/unauthorized-domain':        'This domain is not authorised for sign-in. Contact your administrator.',
    };
    return messages[code] ?? 'An unexpected error occurred. Please try again.';
  }
}
