import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';

type TabKey = 'stores' | 'users' | 'transactions';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      display: grid;
      gap: 20px;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--color-muted);
      text-decoration: none;
      font-size: 14px;
    }
    .back:hover { color: var(--color-ink); }
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .titles {
      display: grid;
      gap: 6px;
    }
    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .page-subtitle {
      margin: 0;
      font-size: 15px;
      color: var(--color-muted);
      line-height: 1.6;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .tabs {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: #f3f4f6;
      border-radius: 10px;
    }
    .tab {
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 500;
      color: var(--color-muted);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab:hover { color: var(--color-ink); }
    .tab.active {
      background: #fff;
      color: var(--color-ink);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .section-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      text-align: left;
      padding: 12px 14px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-muted);
      background: #f9fafb;
      border-bottom: 1px solid var(--color-border);
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-ink);
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    tr:hover td {
      background: #f5f5f5;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: #f9fafb;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .row-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .row-actions .btn {
      padding: 6px 10px;
      font-size: 12px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.ok {
      background: #ecfdf5;
      color: #059669;
    }
    .status-badge.warn {
      background: #fffbeb;
      color: #b45309;
    }
    .status-badge.err {
      background: #fef2f2;
      color: #dc2626;
    }
    .status-badge.info {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }
    .store-info-card {
      display: grid;
      gap: 10px;
    }
    .store-info-card h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
    }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
    }
    .info-row {
      display: grid;
      gap: 2px;
    }
    .info-row .k {
      font-size: 12px;
      color: var(--color-muted);
      font-weight: 500;
    }
    .info-row .v {
      font-size: 14px;
      color: var(--color-ink);
    }
    .add-user-form {
      display: grid;
      gap: 12px;
      padding: 16px;
      background: #f9fafb;
      border-radius: var(--radius-sm);
      margin-top: 12px;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .form-grid-2 { grid-template-columns: 1fr; }
    }
    .form-field {
      display: grid;
      gap: 6px;
    }
    .form-field label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-ink);
    }
    .form-field input, .form-field select {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      font-size: 14px;
      color: var(--color-ink);
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }
    .form-field input:focus, .form-field select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-50);
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 16px;
      flex-wrap: wrap;
    }
    .pagination-info {
      font-size: 13px;
      color: var(--color-muted);
    }
    .pagination-buttons {
      display: flex;
      gap: 8px;
    }
    .access-denied {
      text-align: center;
      padding: 48px 24px;
    }
    .access-denied h2 {
      margin: 0 0 8px;
      font-size: 24px;
      color: #dc2626;
    }
    .access-denied p {
      margin: 0 0 20px;
      color: var(--color-muted);
    }
    .loading, .empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--color-muted);
      font-size: 14px;
    }
    .error-box {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      font-size: 14px;
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      @if (!isAdminish()) {
        <div class="card access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <a class="btn btn-primary" routerLink="/">Return to home</a>
        </div>
      } @else {
        <div class="page-header">
          <div class="titles">
            <h1 class="page-title">Admin Dashboard</h1>
            <p class="page-subtitle">Manage stores, users, and view transaction history.</p>
          </div>
          <div class="header-actions">
            <span class="status-badge info">{{ currentUser()?.name || currentUser()?.email }}</span>
            <button class="btn btn-secondary" (click)="onLogout()" [disabled]="loggingOut()">
              @if (loggingOut()) { Logging out… } @else { Log out }
            </button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab" [class.active]="activeTab() === 'stores'" (click)="activeTab.set('stores')">Stores</button>
          <button class="tab" [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">Users</button>
          <button class="tab" [class.active]="activeTab() === 'transactions'" (click)="activeTab.set('transactions')">Transactions</button>
        </div>

        @if (activeTab() === 'stores') {
          <section class="card" style="display: grid; gap: 16px;">
            <div class="section-header">
              <h2 class="section-title">Stores</h2>
            </div>

            @if (storesLoading()) {
              <div class="loading">Loading stores…</div>
            } @else if (storesError()) {
              <div class="error-box">{{ storesError() }}</div>
            } @else if (isGlobalAdmin()) {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Lat</th>
                      <th>Lng</th>
                      <th>Onboarded</th>
                      <th>Subscription</th>
                      <th>Users</th>
                      <th>Tx</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (store of stores(); track store.id) {
                      <tr>
                        <td><span class="mono">{{ store.id?.slice(0, 10) }}…</span></td>
                        <td>{{ store.businessName || store.name || '—' }}</td>
                        <td>{{ store.latitude ?? '—' }}</td>
                        <td>{{ store.longitude ?? '—' }}</td>
                        <td>
                          <span class="status-badge" [class.ok]="store.onboarded" [class.warn]="!store.onboarded">
                            {{ store.onboarded ? 'Yes' : 'No' }}
                          </span>
                        </td>
                        <td>
                          <span class="status-badge info">
                            {{ store.subscriptionStatus || store.plan || 'Standard' }}
                          </span>
                        </td>
                        <td>{{ store.usersCount ?? '—' }}</td>
                        <td>{{ store.txCount ?? '—' }}</td>
                        <td>
                          <div class="row-actions">
                            <button class="btn btn-secondary" (click)="onEditStore(store)">Edit</button>
                            <button class="btn btn-secondary" (click)="onSuspendStore(store)">
                              {{ store.suspended ? 'Unsuspend' : 'Suspend' }}
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="9" class="empty">No stores found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              @if (myStore()) {
                <div class="store-info-card">
                  <h3>{{ myStore()!.businessName || myStore()!.name || 'Your Store' }}</h3>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="k">Store ID</span>
                      <span class="v"><span class="mono">{{ myStore()!.id }}</span></span>
                    </div>
                    <div class="info-row">
                      <span class="k">Business Name</span>
                      <span class="v">{{ myStore()!.businessName || myStore()!.name || '—' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="k">Location</span>
                      <span class="v">{{ myStore()!.latitude }}, {{ myStore()!.longitude }}</span>
                    </div>
                    <div class="info-row">
                      <span class="k">Onboarded</span>
                      <span class="v">
                        <span class="status-badge" [class.ok]="myStore()!.onboarded" [class.warn]="!myStore()!.onboarded">
                          {{ myStore()!.onboarded ? 'Yes' : 'No' }}
                        </span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="k">Subscription</span>
                      <span class="v">
                        <span class="status-badge info">
                          {{ myStore()!.subscriptionStatus || myStore()!.plan || 'Standard' }}
                        </span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="k">Users</span>
                      <span class="v">{{ myStore()!.usersCount ?? '—' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="k">Transactions</span>
                      <span class="v">{{ myStore()!.txCount ?? '—' }}</span>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="empty">No store information available.</div>
              }
            }
          </section>
        }

        @if (activeTab() === 'users') {
          <section class="card" style="display: grid; gap: 16px;">
            <div class="section-header">
              <h2 class="section-title">Users</h2>
              <button class="btn btn-primary" (click)="showAddUser.set(!showAddUser())" [disabled]="addingUser()">
                @if (showAddUser()) { Cancel } @else { + Add user }
              </button>
            </div>

            @if (showAddUser()) {
              <form class="add-user-form" [formGroup]="addUserForm" (ngSubmit)="onAddUser()">
                <div class="form-grid-2">
                  <div class="form-field">
                    <label for="u-email">Email</label>
                    <input id="u-email" type="email" formControlName="email" placeholder="user@example.com" />
                  </div>
                  <div class="form-field">
                    <label for="u-name">Name</label>
                    <input id="u-name" type="text" formControlName="name" placeholder="Full name" />
                  </div>
                  <div class="form-field">
                    <label for="u-role">Role</label>
                    <select id="u-role" formControlName="role">
                      <option value="STORE_ADMIN">Store Admin</option>
                      <option value="OWNER">Owner</option>
                      <option value="CLERK">Clerk / Staff</option>
                      <option value="RUNNER">Runner / Fulfillment</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="u-phone">Phone</label>
                    <input id="u-phone" type="text" formControlName="phone" placeholder="+1 555 000 0000" />
                  </div>
                </div>
                <div class="form-field">
                  <label for="u-password">Password</label>
                  <input id="u-password" type="password" formControlName="password" placeholder="At least 8 characters" />
                </div>
                <div style="display: flex; justify-content: flex-end;">
                  <button type="submit" class="btn btn-primary" [disabled]="addingUser() || !addUserForm.valid">
                    @if (addingUser()) { Saving… } @else { Save user }
                  </button>
                </div>
              </form>
            }

            @if (userError()) {
              <div class="error-box">{{ userError() }}</div>
            }

            @if (usersLoading()) {
              <div class="loading">Loading users…</div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (u of users(); track u.id || u.userId) {
                      <tr>
                        <td>{{ u.name || u.fullName || '—' }}</td>
                        <td>{{ u.email }}</td>
                        <td>
                          <span class="status-badge info">{{ u.role || '—' }}</span>
                        </td>
                        <td>{{ u.phone || '—' }}</td>
                        <td>
                          <span class="status-badge"
                                [class.ok]="u.status === 'ACTIVE' || !u.status || u.active"
                                [class.err]="u.status === 'SUSPENDED' || u.status === 'DISABLED'"
                                [class.warn]="u.status === 'PENDING'">
                            {{ u.status || (u.active ? 'ACTIVE' : 'INACTIVE') }}
                          </span>
                        </td>
                        <td>
                          <div class="row-actions">
                            <button class="btn btn-secondary" (click)="onToggleUserStatus(u)">
                              {{ u.status === 'SUSPENDED' || u.status === 'DISABLED' || u.active === false ? 'Activate' : 'Suspend' }}
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="empty">No users found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        @if (activeTab() === 'transactions') {
          <section class="card" style="display: grid; gap: 16px;">
            <div class="section-header">
              <h2 class="section-title">Transactions</h2>
            </div>

            @if (txLoading()) {
              <div class="loading">Loading transactions…</div>
            } @else if (txError()) {
              <div class="error-box">{{ txError() }}</div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Stores</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (tx of pagedTransactions(); track tx.id) {
                      <tr>
                        <td><span class="mono">{{ tx.id?.slice(0, 12) }}…</span></td>
                        <td>{{ tx.originatingStoreName || tx.storeName || tx.fulfillingStoreName || '—' }}</td>
                        <td>
                          <span class="status-badge" [class]="txStatusClass(tx.status)">
                            {{ tx.status || '—' }}
                          </span>
                        </td>
                        <td>{{ formatMoney(tx.totalRetailCents ?? tx.totalCents ?? tx.amountCents, tx.currency) }}</td>
                        <td>{{ tx.createdAt | date:'short' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="empty">No transactions found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="pagination">
                <span class="pagination-info">
                  Showing {{ pageStart() + 1 }}–{{ pageEnd() }} of {{ transactions().length }}
                </span>
                <div class="pagination-buttons">
                  <button class="btn btn-secondary" (click)="txPage.set(txPage() - 1)" [disabled]="txPage() === 0">
                    ← Prev
                  </button>
                  <button class="btn btn-secondary" (click)="txPage.set(txPage() + 1)" [disabled]="pageEnd() >= transactions().length">
                    Next →
                  </button>
                </div>
              </div>
            }
          </section>
        }
      }
    </div>
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  readonly activeTab = signal<TabKey>('stores');
  readonly currentUser = signal<AuthUser | null>(null);

  readonly stores = signal<any[]>([]);
  readonly storesLoading = signal(false);
  readonly storesError = signal<string | null>(null);
  readonly myStore = signal<any | null>(null);

  readonly users = signal<any[]>([]);
  readonly usersLoading = signal(false);
  readonly userError = signal<string | null>(null);
  readonly showAddUser = signal(false);
  readonly addingUser = signal(false);
  readonly addUserForm: FormGroup;

  readonly transactions = signal<any[]>([]);
  readonly txLoading = signal(false);
  readonly txError = signal<string | null>(null);
  readonly txPage = signal(0);
  readonly txPageSize = 10;

  readonly loggingOut = signal(false);

  readonly isGlobalAdmin = computed(() => {
    const u = this.currentUser();
    return !!(u?.isGlobalAdmin || u?.role === 'GLOBAL_ADMIN');
  });

  readonly isAdminish = computed(() => {
    const u = this.currentUser();
    return !!(
      u?.isGlobalAdmin ||
      u?.role === 'GLOBAL_ADMIN' ||
      u?.role === 'STORE_ADMIN' ||
      u?.role === 'OWNER'
    );
  });

  readonly pagedTransactions = computed(() => {
    const start = this.txPage() * this.txPageSize;
    return this.transactions().slice(start, start + this.txPageSize);
  });

  readonly pageStart = computed(() => this.txPage() * this.txPageSize);
  readonly pageEnd = computed(() => Math.min(this.pageStart() + this.txPageSize, this.transactions().length));

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpClient,
    private readonly fb: FormBuilder,
  ) {
    this.currentUser.set(authService.currentUser$.getValue());
    this.addUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', [Validators.required]],
      role: ['STORE_ADMIN', [Validators.required]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  private api(): string {
    return this.authService.resolveApiBasePublic();
  }

  ngOnInit(): void {
    if (!this.isAdminish()) return;
    this.loadStores();
    this.loadUsers();
    this.loadTransactions();
    this.refreshMe();
  }

  private async refreshMe(): Promise<void> {
    try {
      const u = await this.authService.me();
      this.currentUser.set(u);
    } catch {
      /* ignore */
    }
  }

  private async loadStores(): Promise<void> {
    this.storesLoading.set(true);
    this.storesError.set(null);
    try {
      const api = this.api();
      const res = await firstValueFrom(this.http.get<any>(`${api}/admin/stores`));
      const arr = Array.isArray(res) ? res : (res?.stores ?? res?.data ?? []);
      this.stores.set(arr);
      const u = this.currentUser();
      if (!this.isGlobalAdmin() && u?.storeId) {
        const mine = arr.find((s: any) => s.id === u.storeId) || arr[0] || null;
        this.myStore.set(mine);
      } else if (!this.isGlobalAdmin() && arr.length === 1) {
        this.myStore.set(arr[0]);
      }
    } catch (err: any) {
      this.storesError.set(err?.message ?? 'Failed to load stores.');
    } finally {
      this.storesLoading.set(false);
    }
  }

  private async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.userError.set(null);
    try {
      const api = this.api();
      const u = this.currentUser();
      const suffix = u?.storeId && !this.isGlobalAdmin() ? `?storeId=${encodeURIComponent(u.storeId)}` : '';
      const res = await firstValueFrom(this.http.get<any>(`${api}/admin/users${suffix}`));
      const arr = Array.isArray(res) ? res : (res?.users ?? res?.data ?? []);
      this.users.set(arr);
    } catch (err: any) {
      this.userError.set(err?.message ?? 'Failed to load users.');
    } finally {
      this.usersLoading.set(false);
    }
  }

  private async loadTransactions(): Promise<void> {
    this.txLoading.set(true);
    this.txError.set(null);
    try {
      const api = this.api();
      const u = this.currentUser();
      const suffix = u?.storeId && !this.isGlobalAdmin() ? `?storeId=${encodeURIComponent(u.storeId)}` : '';
      const res = await firstValueFrom(this.http.get<any>(`${api}/admin/transactions${suffix}`));
      const arr = Array.isArray(res) ? res : (res?.items ?? res?.transactions ?? res?.data ?? []);
      this.transactions.set(arr);
    } catch (err: any) {
      this.txError.set(err?.message ?? 'Failed to load transactions.');
    } finally {
      this.txLoading.set(false);
    }
  }

  async onAddUser(): Promise<void> {
    if (!this.addUserForm.valid) return;
    this.addingUser.set(true);
    try {
      const api = this.api();
      const v = this.addUserForm.value;
      const u = this.currentUser();
      const payload: any = {
        email: v.email,
        name: v.name,
        role: v.role,
        phone: v.phone || undefined,
        password: v.password,
      };
      if (u?.storeId) payload.storeId = u.storeId;
      await firstValueFrom(this.http.post(`${api}/admin/users`, payload));
      this.addUserForm.reset({ role: 'STORE_ADMIN' });
      this.showAddUser.set(false);
      await this.loadUsers();
    } catch (err: any) {
      this.userError.set(err?.error?.message ?? err?.message ?? 'Failed to create user.');
    } finally {
      this.addingUser.set(false);
    }
  }

  onToggleUserStatus(user: any): void {
    const id = user.id || user.userId;
    if (!id) return;
    const suspended = user.status === 'SUSPENDED' || user.status === 'DISABLED' || user.active === false;
    const newStatus = suspended ? 'ACTIVE' : 'SUSPENDED';
    const api = this.api();
    firstValueFrom(
      this.http.patch(`${api}/admin/users/${encodeURIComponent(id)}/status`, { status: newStatus })
    ).then(() => this.loadUsers()).catch(() => this.loadUsers());
  }

  onEditStore(store: any): void {
    alert(`Edit store: ${store.businessName || store.name || store.id}`);
  }

  onSuspendStore(store: any): void {
    const id = store.id;
    if (!id) return;
    const suspended = !!store.suspended;
    const api = this.api();
    firstValueFrom(
      this.http.patch(`${api}/admin/stores/${encodeURIComponent(id)}/status`, { suspended: !suspended })
    ).then(() => this.loadStores()).catch(() => this.loadStores());
  }

  async onLogout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.authService.logout();
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    } finally {
      this.loggingOut.set(false);
    }
  }

  txStatusClass(s: string): string {
    if (!s) return 'info';
    const lower = s.toLowerCase();
    if (lower.includes('complete') || lower.includes('settled') || lower.includes('success') || lower.includes('paid')) return 'ok';
    if (lower.includes('fail') || lower.includes('cancel') || lower.includes('refund') || lower.includes('error')) return 'err';
    if (lower.includes('pend') || lower.includes('process') || lower.includes('hold')) return 'warn';
    return 'info';
  }

  formatMoney(cents: number | undefined | null, currency: string | undefined): string {
    if (cents === undefined || cents === null) return '—';
    const c = currency || 'USD';
    const n = cents / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
  }
}
