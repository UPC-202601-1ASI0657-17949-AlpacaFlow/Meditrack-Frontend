import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule, NgIf } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';
import { User } from '../../../domain/model/user.entity';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);
  private registrationFlowStore = inject(RegistrationFlowStore);

  signupForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;
  errorMessage: string | null = null;
  selectedRole: string = 'user'; // Default role

  constructor() {
    // Get role from query params
    this.route.queryParams.subscribe(params => {
      this.selectedRole = params['role'] || 'user';
      
      // If no role is provided, redirect to user type selection
      if (!params['role']) {
        this.router.navigate(['user-type-selection'], { relativeTo: this.route.parent });
      }
    });

    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
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

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { firstName, lastName, email, password } = this.signupForm.value;

    // Save all data temporarily - user is NOT created in DB until payment is completed
    // This prevents users from creating multiple organizations with the same name
    this.registrationFlowStore.setUserData(email, password, this.selectedRole);
    
    // If user is admin, save firstName and lastName for later admin creation
    if (this.selectedRole === 'admin') {
      this.registrationFlowStore.setAdminData(firstName, lastName);
    }
    
    this.isLoading = false;
    // Redirect to subscription selection - user will be created when payment is completed
    this.router.navigate(['subscription-selection'], { relativeTo: this.route.parent });
  }

  navigateToSignIn(): void {
    // Navigate to login within the auth layout (relative route)
    this.router.navigate(['login'], { relativeTo: this.route.parent });
  }
}

