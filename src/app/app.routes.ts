import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { ProductDetailPageComponent } from './pages/product-detail/product-detail-page.component';
import { CheckoutPageComponent } from './pages/checkout/checkout-page.component';
import { CheckoutSuccessPageComponent } from './pages/checkout/checkout-success-page.component';
import { CheckoutCancelPageComponent } from './pages/checkout/checkout-cancel-page.component';
import { StoreOnboardingPageComponent } from './pages/store-onboarding/store-onboarding-page.component';
import { MerchantPickupPageComponent } from './pages/merchant-pickup/merchant-pickup-page.component';
import { SignupPageComponent } from './pages/signup/signup-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { AdminDashboardPageComponent } from './pages/admin/admin-dashboard-page.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',                        component: HomePageComponent,              title: 'Linked-Store' },
  { path: 'p/:productId',            component: ProductDetailPageComponent,     title: 'Product' },
  { path: 'checkout',                component: CheckoutPageComponent,           title: 'Checkout' },
  { path: 'checkout/success',        component: CheckoutSuccessPageComponent,    title: 'Payment successful' },
  { path: 'checkout/cancel',         component: CheckoutCancelPageComponent,     title: 'Payment canceled' },
  { path: 'store/onboarding',        component: StoreOnboardingPageComponent,    title: 'Store Onboarding | Linked-Store' },
  { path: 'merchant/pickup',         component: MerchantPickupPageComponent,     title: 'Merchant Pickup | Linked-Store' },
  { path: 'signup',                  component: SignupPageComponent,             title: 'Sign up' },
  { path: 'login',                   component: LoginPageComponent,              title: 'Log in' },
  { path: 'admin',                   component: AdminDashboardPageComponent,     title: 'Admin | Linked-Store', canActivate: [authGuard], data: { requireStoreAdmin: true } },
  { path: '**',                      redirectTo: '' },
];
