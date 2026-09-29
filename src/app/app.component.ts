import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/footer/footer.component';
import { UpgradeBannerComponent } from './pages/pricing/upgrade-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent, UpgradeBannerComponent],
  template: `
    <app-upgrade-banner />
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
