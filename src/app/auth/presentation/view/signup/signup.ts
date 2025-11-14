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
import { User } from '../../../domain/model/user.entity';

@Component({
  selector: 'app-signup',
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
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);

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

    // Create User entity with role from query params
    // Note: firstName and lastName are captured but not stored in User entity yet
    const user = new User({
      email: email,
      role: this.selectedRole // Role determined by user type selection
    });

    this.authStore.register(user, password).subscribe({
      next: (response) => {
        this.authStore.setAuth(response.token, response.user);
        this.isLoading = false;
        // Redirect to subscription selection after successful registration
        this.router.navigate(['subscription-selection'], { relativeTo: this.route.parent });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'signup.errors.registrationFailed';
        console.error('Signup error:', error);
      }
    });
  }

  navigateToSignIn(): void {
    // Navigate to login within the auth layout (relative route)
    this.router.navigate(['login'], { relativeTo: this.route.parent });
  }
}

