import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  userRole: string = '';
  isRelative: boolean = false;
  isAdmin: boolean = false;

  constructor() {
    // Log immediately when component is constructed
    console.log('🚀🚀🚀 [SubscriptionSelection] CONSTRUCTOR CALLED - Component instance created');
    console.log('🚀🚀🚀 [SubscriptionSelection] Current URL:', window.location.href);
  }

  /**
   * Get current role from store (always fresh)
   */
  private getCurrentRole(): string {
    // Priority 1: Check query params (most reliable)
    const snapshotParams = this.route.snapshot.queryParams;
    if (snapshotParams['role']) {
      const role = snapshotParams['role'].toLowerCase().trim();
      console.log('🔍 [SubscriptionSelection] getCurrentRole from query params:', role);
      return role;
    }
    
    // Priority 2: Check auth store
    const currentUser = this.authStore.currentUser();
    if (currentUser?.role) {
      const role = currentUser.role.toLowerCase().trim();
      console.log('🔍 [SubscriptionSelection] getCurrentRole from auth store:', role);
      return role;
    }
    
    // Priority 3: Check registration flow store
    const storeRole = this.registrationFlowStore.role;
    if (storeRole) {
      const role = storeRole.toLowerCase().trim();
      console.log('🔍 [SubscriptionSelection] getCurrentRole from registration flow store:', role);
      return role;
    }
    
    // Priority 4: Fallback to instance variable
    const fallbackRole = (this.userRole || '').toLowerCase().trim();
    console.log('🔍 [SubscriptionSelection] getCurrentRole fallback:', fallbackRole || '(empty)');
    return fallbackRole;
  }

  ngOnInit(): void {
    // Force immediate log to verify component is loading
    console.log('🔵🔵🔵 [SubscriptionSelection] ngOnInit CALLED - Component is initializing');
    console.log('🔵🔵🔵 [SubscriptionSelection] Route:', this.route);
    console.log('🔵🔵🔵 [SubscriptionSelection] Router:', this.router);
    console.log('🔵🔵🔵 [SubscriptionSelection] AuthStore:', this.authStore);
    console.log('🔵🔵🔵 [SubscriptionSelection] RegistrationFlowStore:', this.registrationFlowStore);
    
    try {
      console.log('🔵 [SubscriptionSelection] ngOnInit - Starting initialization');
      
      // Priority 1: Check query params first (most reliable)
      const snapshotParams = this.route.snapshot.queryParams;
      console.log('🟡 [SubscriptionSelection] Snapshot query params:', snapshotParams);
      
      if (snapshotParams['role']) {
        const roleFromQuery = snapshotParams['role'];
        const normalizedQueryRole = roleFromQuery.toLowerCase().trim();
        console.log('🟢 [SubscriptionSelection] Found role in query params:', roleFromQuery, '-> normalized:', normalizedQueryRole);
        this.userRole = normalizedQueryRole;
        
        // Update the store with the role from query params if we have email
        if (this.registrationFlowStore.email) {
          console.log('🟡 [SubscriptionSelection] Updating store with role from query params');
          this.registrationFlowStore.setUserData(
            this.registrationFlowStore.email,
            this.registrationFlowStore.password,
            normalizedQueryRole
          );
        }
      } else {
        // Priority 2: Check registration flow store
        this.userRole = this.registrationFlowStore.role;
        console.log('🟡 [SubscriptionSelection] Got role from registration flow store:', this.userRole);
        console.log('🟡 [SubscriptionSelection] Full registration flow store:', {
          email: this.registrationFlowStore.email,
          role: this.registrationFlowStore.role,
          hasPassword: !!this.registrationFlowStore.password
        });
        
        // Priority 3: Check auth store (if user is already logged in)
        const currentUser = this.authStore.currentUser();
        if (currentUser?.role) {
          this.userRole = currentUser.role;
          console.log('🟢 [SubscriptionSelection] Got role from auth store:', this.userRole);
        }
      }

      if (!this.userRole) {
        console.error('🔴 [SubscriptionSelection] No role found! Redirecting to login');
        // If no role found, redirect to login
        this.router.navigate(['login'], { relativeTo: this.route.parent });
        return;
      }

      this.updateRoleFlags();
      
      console.log('🟢 [SubscriptionSelection] Final state - User role:', this.userRole);
      console.log('🟢 [SubscriptionSelection] Final state - Is Relative:', this.isRelative);
      console.log('🟢 [SubscriptionSelection] Final state - Is Admin:', this.isAdmin);
      console.log('🟢 [SubscriptionSelection] Final state - Fremium disabled:', this.isPlanDisabled('fremium'));
      console.log('🟢 [SubscriptionSelection] Final state - Premium disabled:', this.isPlanDisabled('premium'));
      console.log('🟢 [SubscriptionSelection] Final state - Enterprise disabled:', this.isPlanDisabled('enterprise'));
      
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
    } catch (error) {
      console.error('🔴 [SubscriptionSelection] Error in ngOnInit:', error);
    }
  }

  /**
   * Update role flags based on current userRole
   */
  private updateRoleFlags(): void {
    // Normalize role to lowercase for comparison
    this.userRole = (this.userRole || '').toLowerCase().trim();
    this.isRelative = this.userRole === 'relative';
    this.isAdmin = this.userRole === 'admin';
    console.log('🔄 [SubscriptionSelection] updateRoleFlags - role:', this.userRole, 'isRelative:', this.isRelative, 'isAdmin:', this.isAdmin);
  }

  /**
   * Check if a subscription plan button should be disabled
   */
  isPlanDisabled(planType: 'fremium' | 'premium' | 'enterprise'): boolean {
    // Always get fresh role from store
    const normalizedRole = this.getCurrentRole();
    const isRelative = normalizedRole === 'relative';
    const isAdmin = normalizedRole === 'admin';
    
    // Update instance variables for consistency
    this.userRole = normalizedRole;
    this.isRelative = isRelative;
    this.isAdmin = isAdmin;
    
    console.log(`🔍 [SubscriptionSelection] isPlanDisabled(${planType}) - role: "${normalizedRole}", isRelative: ${isRelative}, isAdmin: ${isAdmin}`);
    
    if (isRelative) {
      // Relative users can only choose Fremium or Premium (Enterprise is disabled)
      const disabled = planType === 'enterprise';
      console.log(`✅ [SubscriptionSelection] Relative user - ${planType} disabled: ${disabled}`);
      return disabled;
    } else if (isAdmin) {
      // Admin users can only choose Enterprise (Fremium and Premium are disabled)
      const disabled = planType === 'fremium' || planType === 'premium';
      console.log(`✅ [SubscriptionSelection] Admin user - ${planType} disabled: ${disabled}`);
      return disabled;
    }
    
    // Default: no restrictions (shouldn't happen in normal flow)
    console.warn(`⚠️ [SubscriptionSelection] Unknown role "${normalizedRole}" - ${planType} disabled: false`);
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
        console.log('[SubscriptionSelection] User registered successfully:', response);
        
        // Set auth state
        this.authStore.setAuth(response.token, response.user);
        console.log('[SubscriptionSelection] Auth state set. User:', response.user);
        
        // Store planType in registration flow store for later use
        this.registrationFlowStore.setPlanType('freemium');
        console.log('[SubscriptionSelection] Plan type set to freemium');
        
        // Clear temporary registration data (except planType)
        // Don't clear planType yet, we'll need it
        // this.registrationFlowStore.clear();
        
        // Redirect to senior citizen registration form
        // Use absolute path to ensure navigation works correctly
        console.log('[SubscriptionSelection] Navigating to senior-citizen-registration...');
        const navigationPromise = this.router.navigate(['/auth/senior-citizen-registration']);
        navigationPromise.then(
          (success) => {
            if (success) {
              console.log('[SubscriptionSelection] ✅ Successfully navigated to senior-citizen-registration');
            } else {
              console.error('[SubscriptionSelection] ❌ Navigation to senior-citizen-registration failed');
              // Fallback: try relative navigation
              console.log('[SubscriptionSelection] Trying relative navigation as fallback...');
              this.router.navigate(['senior-citizen-registration'], { relativeTo: this.route.parent });
            }
          },
          (error) => {
            console.error('[SubscriptionSelection] ❌ Navigation error:', error);
            // Fallback: try relative navigation
            console.log('[SubscriptionSelection] Trying relative navigation as fallback...');
            this.router.navigate(['senior-citizen-registration'], { relativeTo: this.route.parent });
          }
        );
      },
      error: (error) => {
        console.error('[SubscriptionSelection] Error creating user:', error);
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

