import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'fe';

  constructor(private readonly router: Router) {}

  home() {
    this.router.navigate(['/']);
  }
}
