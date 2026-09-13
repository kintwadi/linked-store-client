import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="navbar">
      <div class="container navbar-inner">
        <a class="brand" routerLink="/">
          <span class="brand-dot"></span>
          Linked-Store
        </a>
        <nav>
          <a routerLink="/" class="muted" style="font-size: 14px; font-weight:500;">Explore</a>
        </nav>
      </div>
    </header>
  `,
})
export class NavbarComponent {}
