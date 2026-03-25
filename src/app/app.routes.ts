import { Routes } from '@angular/router';
import { BiTestComponent } from './bi-test/bi-test.component';
import { HomeComponent } from './sections/home/home.component';
import { ProjectFormComponent } from './components/forms/create-form/project-form.component';
import { UpdateFormComponent } from './components/forms/update-visibility/update-form.component';
import { VotingFormComponent } from './components/forms/voting-form/voting-form.component';
import { UpdateUserStatusFormComponent } from './components/forms/update-user-status-form/update-user-status-form.component';
import { LoginComponent } from './sections/login/login.component';
import { UpdateProjectComponent } from './components/forms/update-project/update-project.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  //public route
  { path: 'login', component: LoginComponent },
  //protected routes
  { path: 'home',                                component: HomeComponent,                  canActivate: [authGuard] },
  { path: 'create-project',                      component: ProjectFormComponent,           canActivate: [authGuard] },
  { path: 'update-project',                      component: UpdateProjectComponent,         canActivate: [authGuard] },
  { path: 'update-project-visibility-and-status',component: UpdateFormComponent,            canActivate: [authGuard] },
  { path: 'voting-form',                         component: VotingFormComponent,            canActivate: [authGuard] },
  { path: 'update-user-status',                  component: UpdateUserStatusFormComponent,  canActivate: [authGuard] },
  { path: 'bi-test',                             component: BiTestComponent,                canActivate: [authGuard] },
];