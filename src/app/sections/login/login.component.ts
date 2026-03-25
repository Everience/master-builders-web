import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { environment } from '../../../environments/environments';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  constructor(
    private router: Router,
    private msalService: MsalService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    // Handle the redirect that comes back from Microsoft login
    this.msalService.initialize().subscribe(() => {
      this.msalService.handleRedirectObservable().subscribe((result: AuthenticationResult | null) => {
  if (result) {
    this.msalService.instance.setActiveAccount(result.account);
    this.router.navigate(['/home']);
  }
});

      // If already logged in, skip login page
      if (this.msalService.instance.getActiveAccount()) {
        this.router.navigate(['/home']);
      }
    });
  }

  login() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.msalService.loginRedirect({
      scopes: environment.msal.scopes
    });
  }

}
