import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { subscriptionLimitInterceptor } from './interceptors/subscription-limit.interceptor';
import { BrandTitleStrategy } from './services/brand-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, subscriptionLimitInterceptor])),
    { provide: TitleStrategy, useClass: BrandTitleStrategy },
  ],
};
