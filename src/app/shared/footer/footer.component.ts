import { Component, inject } from '@angular/core';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="container">
        © {{ year }} {{ brand() }}. Hyperlocal Omnichannel Retail Network.
      </div>
    </footer>
  `,
})
export class FooterComponent {
  year = new Date().getFullYear();
  readonly brand = inject(BrandService).displayName;
}
