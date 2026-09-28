import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent],
  template: `
    <main class="page">
      <div class="container">
        <router-outlet />
      </div>
    </main>
    <app-footer />
  `,
})
export class AppComponent {
  title = 'linked-store-frontend';
}
