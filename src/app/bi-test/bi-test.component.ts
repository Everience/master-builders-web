import { Component } from '@angular/core';
import { AuthService } from '../services/project/auth.service';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bi-test',
  standalone: true,
  imports: [],
  templateUrl: './bi-test.component.html',
  styleUrl: './bi-test.component.scss'
})
export class BiTestComponent {
isAdmin = false;
  userName = '';
  acc: any;

  constructor(private authService: AuthService, private msalService: MsalService, private router: Router) {}

  ngOnInit() {
    this.authService.isAdmin().subscribe(result => {
      this.isAdmin = result;
    });
    this.userName = this.authService.getUserName();
    this.acc = this.authService.getAccount();
    console.log(this.msalService.instance.getActiveAccount()?.idTokenClaims, this.acc);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
