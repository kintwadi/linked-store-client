import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="navbar">
      <div class="container navbar-inner">
        @if (isRunner()) {
          <span class="brand" style="cursor:default;">
            <span class="brand-dot"></span>
            Linked-Store
          </span>
        } @else {
          <a class="brand" routerLink="/">
            <span class="brand-dot"></span>
            Linked-Store
          </a>
        }
        <nav>
          @if (showExplore()) {
            <a routerLink="/" class="muted" style="font-size: 14px; font-weight:500;">Explore</a>
          }
        </nav>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);

  readonly isRunner = computed(() => this.authService.currentUser$?.getValue()?.role === 'RUNNER');
  readonly isAuthenticated = computed(() => this.authService.isLoggedIn());

  /** Hide Explore link for RUNNER users (they are not shoppers; they should not browse stores). */
  readonly showExplore = computed(() => !this.isRunner());
}
