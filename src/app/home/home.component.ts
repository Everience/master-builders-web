import { Component } from '@angular/core';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { VotingFormComponent } from '../voting-form/voting-form.component';
import { BiTestComponent } from '../bi-test/bi-test.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ProjectFormComponent, VotingFormComponent, BiTestComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  projectFormIsVisible: boolean = false;
  votingFormIsVisible: boolean = false;
  BIVisible: boolean= false;

  showProjectForm() {
    this.projectFormIsVisible = !this.projectFormIsVisible;
  }

  showVotingForm() {
    this.votingFormIsVisible = !this.votingFormIsVisible;
  }

  showBI(){
    this.BIVisible = !this.BIVisible;
  }

  restoreVariables() {
    this.projectFormIsVisible = false;
    this.votingFormIsVisible = false;
    this.BIVisible= false;
  }
}
