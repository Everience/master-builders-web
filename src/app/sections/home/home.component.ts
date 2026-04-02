import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/project/auth.service';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  isAdmin = false;
  userName = '';
  acc: any;

  constructor(private authService: AuthService, private msalService: MsalService) {}

  ngOnInit() {
    this.authService.isAdmin().subscribe(result => {
      this.isAdmin = result;
    });
    this.userName = this.authService.getUserName();
    this.acc = this.authService.getAccount();
    console.log(this.msalService.instance.getActiveAccount()?.idTokenClaims, this.acc);
  }
}