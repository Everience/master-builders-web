import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HomeComponent } from './sections/home/home.component';
import { MsalService } from '@azure/msal-angular';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToastComponent } from './components/shared/toast/toast.component';
import { msalPostLogoutRedirectUri } from './msal-redirect';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HomeComponent, CommonModule, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'mb';
  msalInitialized = false;

  constructor(private router: Router, private msalService: MsalService, @Inject(PLATFORM_ID) private platformId: Object) {}
    
  get isDashboard() {
    return this.router.url.includes('home');
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
      this.msalService.initialize().subscribe(() => {
      this.msalService.handleRedirectObservable().subscribe();
      this.msalInitialized = true;
    });
  }

  logout() {
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: msalPostLogoutRedirectUri(),
    });
  }
}
