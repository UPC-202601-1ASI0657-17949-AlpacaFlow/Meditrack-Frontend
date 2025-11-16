import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';
import { OrganizationApi } from '../../../../organization/infrastructure/organization-api';
import { Organization } from '../../../../organization/domain/model/organization.entity';
import { Admin } from '../../../../organization/domain/model/admin.entity';
import { User } from '../../../domain/model/user.entity';
import { switchMap, of } from 'rxjs';

@Component({
  selector: 'app-billing-information',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './billing-information.html',
  styleUrl: './billing-information.css'
})
export class BillingInformationComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);
  private registrationFlowStore = inject(RegistrationFlowStore);
  private organizationApi = inject(OrganizationApi);

  billingForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor() {
    this.billingForm = this.fb.group({
      cardNumber: ['', [Validators.required, this.cardNumberValidator]],
      expirationDate: ['', [Validators.required, this.expirationDateValidator]],
      securityCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Custom validator for card number (basic validation)
   */
  cardNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    // Remove spaces and check if it's numeric and has 13-19 digits
    const cleaned = value.replace(/\s/g, '');
    if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
      return { invalidCardNumber: true };
    }
    return null;
  }

  /**
   * Custom validator for expiration date (MM/YY format)
   */
  expirationDateValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    // Check MM/YY format
    const pattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!pattern.test(value)) {
      return { invalidExpirationDate: true };
    }
    return null;
  }

  /**
   * Custom validator to check if passwords match
   */
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  /**
   * Format card number with spaces (e.g., 1234 5678 9012 3456)
   */
  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s/g, ''); // Remove existing spaces
    value = value.replace(/\D/g, ''); // Remove non-digits
    
    // Add spaces every 4 digits
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    
    this.billingForm.patchValue({ cardNumber: formatted }, { emitEvent: false });
  }

  /**
   * Format expiration date as MM/YY
   */
  onExpirationDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    
    this.billingForm.patchValue({ expirationDate: value }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.billingForm.invalid) {
      this.billingForm.markAllAsTouched();
      return;
    }

    // This is a static form, billing data is ignored for now
    // But this is where we create user, organization and admin after payment is completed
    const role = this.registrationFlowStore.role;
    
    if (role === 'relative') {
      // For relative users, create user and redirect
      this.createUserAndRedirect();
    } else if (role === 'admin') {
      // For admin users, create user, organization and admin
      this.createUserOrganizationAndAdmin();
    } else {
      // No role found, redirect to login
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Creates user for relative users after payment form is completed
   */
  private createUserAndRedirect(): void {
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
        this.registrationFlowStore.setPlanType('premium');
        
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
   * Creates user, organization and admin after payment form is completed
   * This ensures users complete payment before anything is created in DB
   */
  private createUserOrganizationAndAdmin(): void {
    const email = this.registrationFlowStore.email;
    const password = this.registrationFlowStore.password;
    const role = this.registrationFlowStore.role;
    const institutionName = this.registrationFlowStore.institutionName;
    const institutionType = this.registrationFlowStore.institutionType;
    const adminFirstName = this.registrationFlowStore.adminFirstName;
    const adminLastName = this.registrationFlowStore.adminLastName;

    // Validate that all required data is available
    if (!email || !password || !role || !institutionName || !institutionType || !adminFirstName || !adminLastName) {
      console.error('Missing registration flow data');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Step 1: Create user in DB
    const user = new User({
      email: email,
      role: role
    });

    this.authStore.register(user, password).pipe(
      switchMap((userResponse) => {
        // Step 2: After user is created, create organization
        const organization = new Organization({
          name: institutionName,
          type: institutionType
        });

        return this.organizationApi.createOrganization(organization).pipe(
          switchMap((createdOrganization) => {
            // Step 3: After organization is created, create the admin
            const admin = new Admin({
              organizationId: createdOrganization.id,
              userId: userResponse.user.id,
              firstName: adminFirstName,
              lastName: adminLastName
            });

            return this.organizationApi.createAdmin(admin).pipe(
              switchMap((createdAdmin) => {
                // Set auth state with created user
                this.authStore.setAuth(userResponse.token, userResponse.user);
                
                // Clear temporary registration data
                this.registrationFlowStore.clear();
                
                // Return both organization and user for final redirect
                // The organization layout will handle routing based on institution type
                return of({ organization: createdOrganization, userId: userResponse.user.id });
              })
            );
          })
        );
      })
    ).subscribe({
      next: (result) => {
        // Redirect to organization routes with userId and role
        // Format: /organization/:organizationId/:userRole/:userId
        this.router.navigate(['/organization', result.organization.id, 'admin', result.userId]);
      },
      error: (error) => {
        console.error('Error creating user, organization and admin:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        // On error, redirect to login
        this.router.navigate(['/auth/login']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../subscription-selection'], { relativeTo: this.route.parent });
  }
}

