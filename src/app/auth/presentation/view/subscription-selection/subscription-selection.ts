import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';
import { User } from '../../../domain/model/user.entity';

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
  private registrationFlowStore = inject(RegistrationFlowStore);

  userRole: string = '';
  isRelative: boolean = false;
  isAdmin: boolean = false;

  ngOnInit(): void {
    // Get user role from registration flow store (user not created in DB yet)
    // If user is already logged in, get role from auth store
    const currentUser = this.authStore.currentUser();
    if (currentUser) {
      this.userRole = currentUser.role;
    } else {
      // User not created yet, get role from registration flow
      this.userRole = this.registrationFlowStore.role;
    }

    if (!this.userRole) {
      // If no role found, redirect to login
      this.router.navigate(['login'], { relativeTo: this.route.parent });
      return;
    }

    this.isRelative = this.userRole === 'relative';
    this.isAdmin = this.userRole === 'admin';
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
    } else if (this.isRelative && planType === 'fremium') {
      // For fremium (relative), create user immediately (no payment required)
      this.createUserForRelative();
    } else {
      // Fallback
      this.router.navigate(['/']);
    }
  }

  /**
   * Creates user for relative users when they select fremium plan
   */
  private createUserForRelative(): void {
    const email = this.registrationFlowStore.email;
    const password = this.registrationFlowStore.password;
    const role = this.registrationFlowStore.role;

    // Validate required data
    if (!email || !password || !role) {
      console.error('Missing registration flow data for relative user');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Create user in DB
    const user = new User({
      email: email,
      role: role
    });

    this.authStore.register(user, password).subscribe({
      next: (response) => {
        // Set auth state
        this.authStore.setAuth(response.token, response.user);
        
        // Store planType in registration flow store for later use
        this.registrationFlowStore.setPlanType('freemium');
        
        // Clear temporary registration data (except planType)
        // Don't clear planType yet, we'll need it
        // this.registrationFlowStore.clear();
        
        // Redirect to senior citizen registration form
        this.router.navigate(['senior-citizen-registration'], { relativeTo: this.route.parent });
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.router.navigate(['/auth/login']);
      }
    });
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

