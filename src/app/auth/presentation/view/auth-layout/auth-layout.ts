import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { filter, Subscription } from 'rxjs';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';
import { AuthStore } from '../../../application/auth.store';
import { signal } from '@angular/core';

/**
 * Layout component for authentication screens (login, signup, etc.)
 * Similar to OrganizationLayout but without sidenav, with language switcher in top-right corner
 */
@Component({
  selector: 'app-auth-layout',
  imports: [
    RouterOutlet,
    TranslatePipe,
    MatToolbar,
    MatIconModule,
    LanguageSwitcher
  ],
  templateUrl: './auth-layout.html',
  standalone: true,
  styleUrl: './auth-layout.css'
})
export class AuthLayout implements OnInit, OnDestroy {
  private router = inject(Router);
  private authStore = inject(AuthStore);
  
  private routerSubscription?: Subscription;
  private currentRouteSignal = signal<string>('');

  ngOnInit(): void {
    // Track route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRouteSignal.set(event.url);
      });

    this.currentRouteSignal.set(this.router.url);
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Gets the current route
   */
  getCurrentRoute(): string {
    return this.currentRouteSignal();
  }
}

