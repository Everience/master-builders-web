import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/project/auth.service';

type GuideTab = 'voters' | 'admins' | 'faq';

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-guide.component.html',
  styleUrl: './user-guide.component.scss',
})
export class UserGuideComponent implements OnInit {
  activeTab: GuideTab = 'voters';
  isAdmin = false;
  openFaq: number | null = null;

  faq = [
    {
      q: 'No project appears in my voting list. Why?',
      a: 'Either the project is inactive for visibility, you have already voted on it, or there are no eligible projects right now. Clear the search and confirm the code; ask an admin to check visibility if needed.',
    },
    {
      q: 'I picked the wrong project — how do I change it?',
      a: 'The selector locks after you choose a project to prevent accidental edits. Use the X / reset control, then search and select the correct one.',
    },
    {
      q: 'My vote will not submit.',
      a: 'A required score or reason is probably missing, or there was a brief network/login issue. Complete the fields, try once more, then contact support with the message you saw.',
    },
    {
      q: "Power BI doesn't show my latest vote.",
      a: 'Results refresh twice a day (05:00 and 17:00). Check that no filters are active and wait for the next refresh.',
    },
    {
      q: 'Can I vote again after a project reopens?',
      a: 'Reopening visibility only lets people who have NOT yet voted cast a vote. It never erases or replaces existing votes. A new phase, however, is a separate record you may be able to vote on.',
    },
    {
      q: "I can't access a section.",
      a: 'Your role or user status may not allow it. Ask an administrator to check your active user record and role assignment.',
    },
  ];

  constructor(private router: Router, private authService: AuthService) {}

  async ngOnInit() {
    // mirror however your app resolves admin elsewhere
    try {
      //this.isAdmin = await this.authService.isAdmin();
    } catch {
      this.isAdmin = false;
    }
  }

  setTab(tab: GuideTab) {
    this.activeTab = tab;
    this.openFaq = null;
  }

  toggleFaq(i: number) {
    this.openFaq = this.openFaq === i ? null : i;
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
