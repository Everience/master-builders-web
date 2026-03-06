import { Routes } from '@angular/router';
import { BiTestComponent } from './bi-test/bi-test.component';
import { HomeComponent } from './sections/home/home.component';
import { ProjectFormComponent } from './components/forms/create-form/project-form.component';
import { UpdateFormComponent } from './components/forms/update-project-form/update-form.component';
import { VotingFormComponent } from './components/forms/voting-form/voting-form.component';
import { UpdateUserStatusFormComponent } from './components/forms/update-user-status-form/update-user-status-form.component';
import { LoginComponent } from './sections/login/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'create-project', component: ProjectFormComponent },
  { path: 'update-project-visibility-and-status', component: UpdateFormComponent },
  { path: 'voting-form', component: VotingFormComponent },
  { path: 'update-user-status', component: UpdateUserStatusFormComponent },
  { path: 'bi-test', component: BiTestComponent },
  { path: 'login', component: LoginComponent },
];
