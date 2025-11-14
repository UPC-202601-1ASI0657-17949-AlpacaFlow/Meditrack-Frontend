import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

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

    // This is a static form, just redirect to home
    // In the future, this could send billing information to a payment processor
    this.router.navigate(['/']);
  }

  goBack(): void {
    this.router.navigate(['../subscription-selection'], { relativeTo: this.route.parent });
  }
}

