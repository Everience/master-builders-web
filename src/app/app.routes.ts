import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProjectFormComponent } from './forms/create-form/project-form.component';
import { VotingFormComponent } from './forms/voting-form/voting-form.component';
import { BiTestComponent } from './bi-test/bi-test.component'; // adjust path if needed
import { UpdateFormComponent } from './forms/update-project-form/update-form.component';
import { UpdateUserStatusFormComponent } from './forms/update-user-status-form/update-user-status-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'project-form', component: ProjectFormComponent },
  { path: 'update-project', component: UpdateFormComponent },
  { path: 'update-user-status', component: UpdateUserStatusFormComponent },
  { path: 'voting-form', component: VotingFormComponent },
  { path: 'bi-test', component: BiTestComponent },
];
