import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    :host {
      display: block;
      width: 100%;
      padding: 20px 20px 0 20px;
      box-sizing: border-box;
    }
    .brand-wrap {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      text-decoration: none;
      letter-spacing: -0.01em;
      user-select: none;
    }
    .brand.plain {
      cursor: default;
    }
    .brand-dot {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      box-shadow: 0 3px 8px rgba(79, 70, 229, 0.25);
    }
  `],
  template: `
    <div class="brand-wrap">
      @if (isRunner()) {
        <span class="brand plain">
          <span class="brand-dot"></span>
          {{ brand() }}
        </span>
      } @else {
        <a class="brand" routerLink="/">
          <span class="brand-dot"></span>
          {{ brand() }}
        </a>
      }
    </div>
  `,
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly brandService = inject(BrandService);

  readonly brand = this.brandService.displayName;
  readonly isRunner = computed(() => this.authService.currentUser$?.getValue()?.role === 'RUNNER');
  readonly isAuthenticated = computed(() => this.authService.isLoggedIn());
}
