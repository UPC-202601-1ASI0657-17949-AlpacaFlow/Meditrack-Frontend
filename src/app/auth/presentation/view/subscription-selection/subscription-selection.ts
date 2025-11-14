import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';

@Component({
  selector: 'app-subscription-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './subscription-selection.html',
  styleUrl: './subscription-selection.css'
})
export class SubscriptionSelectionComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);

  userRole: string = '';
  isRelative: boolean = false;
  isAdmin: boolean = false;

  ngOnInit(): void {
    // Get user role from auth store
    const currentUser = this.authStore.currentUser();
    if (currentUser) {
      this.userRole = currentUser.role;
      this.isRelative = this.userRole === 'relative';
      this.isAdmin = this.userRole === 'admin';
    } else {
      // If no user, redirect to login
      this.router.navigate(['login'], { relativeTo: this.route.parent });
    }
  }

  /**
   * Check if a subscription plan button should be disabled
   */
  isPlanDisabled(planType: 'fremium' | 'premium' | 'enterprise'): boolean {
    if (this.isRelative) {
      // Relative users can only choose Fremium or Premium
      return planType === 'enterprise';
    } else if (this.isAdmin) {
      // Admin users can only choose Enterprise
      return planType === 'fremium' || planType === 'premium';
    }
    return false;
  }

  /**
   * Handle subscription plan selection
   */
  selectPlan(planType: 'fremium' | 'premium' | 'enterprise'): void {
    if (this.isPlanDisabled(planType)) {
      return; // Don't proceed if plan is disabled
    }

    console.log(`Selected plan: ${planType} for role: ${this.userRole}`);
    
    // If relative selects premium, redirect to billing information
    if (this.isRelative && planType === 'premium') {
      this.router.navigate(['billing-information'], { relativeTo: this.route.parent });
    } else {
      // For fremium (relative), redirect to home
      this.router.navigate(['/']);
    }
  }

  /**
   * Handle contact us for Enterprise plan (admin users)
   */
  contactUs(): void {
    if (this.isAdmin) {
      // Admin users selecting Enterprise should go to institution details
      this.router.navigate(['institution-details'], { relativeTo: this.route.parent });
    } else {
      // This shouldn't happen, but just in case
      console.warn('Contact Us clicked but user is not admin');
    }
  }

  /**
   * Navigate back to signup
   */
  navigateBack(): void {
    this.router.navigate(['signup'], { relativeTo: this.route.parent });
  }
}

