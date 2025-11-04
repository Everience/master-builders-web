import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProjectFormComponent } from './project-form/project-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ProjectFormComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'mb';
}
