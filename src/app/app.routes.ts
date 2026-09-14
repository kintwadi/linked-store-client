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
import { StoreDashboardShellComponent } from './pages/store-dashboard/store-dashboard-shell.component';
import { StoreProductsListComponent } from './pages/store-dashboard/store-products-list.component';
import { StoreProductFormComponent } from './pages/store-dashboard/store-product-form.component';
import { StoreTransactionsListComponent } from './pages/store-dashboard/store-transactions-list.component';

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
  { path: 'admin/stores/:storeId',   component: StoreDashboardShellComponent,    canActivate: [authGuard], data: { requireStoreAdmin: true }, children: [
    { path: '', redirectTo: 'products', pathMatch: 'full' },
    { path: 'products', component: StoreProductsListComponent },
    { path: 'products/new', component: StoreProductFormComponent },
    { path: 'products/:variantId', component: StoreProductFormComponent },
    { path: 'transactions', component: StoreTransactionsListComponent },
  ]},
  { path: '**',                      redirectTo: '' },
];
