import { Injectable, signal } from '@angular/core';

/**
 * Temporary store to hold registration flow data before final submission
 * This ensures users complete the payment form before creating organization and admin
 */
@Injectable({
  providedIn: 'root'
})
export class RegistrationFlowStore {
  // User data (from signup form) - NOT created in DB until payment is completed
  private _email = signal<string>('');
  private _password = signal<string>('');
  private _role = signal<string>('');
  
  // Admin data (from signup form)
  private _adminFirstName = signal<string>('');
  private _adminLastName = signal<string>('');

  // Organization data (from institution details form)
  private _institutionName = signal<string>('');
  private _institutionType = signal<'clinic' | 'resident' | null>(null);

  // Plan type (for relative users)
  private _planType = signal<string>('');

  /**
   * Get user email
   */
  get email(): string {
    return this._email();
  }

  /**
   * Get user password
   */
  get password(): string {
    return this._password();
  }

  /**
   * Get user role
   */
  get role(): string {
    return this._role();
  }

  /**
   * Get admin first name
   */
  get adminFirstName(): string {
    return this._adminFirstName();
  }

  /**
   * Get admin last name
   */
  get adminLastName(): string {
    return this._adminLastName();
  }

  /**
   * Get institution name
   */
  get institutionName(): string {
    return this._institutionName();
  }

  /**
   * Get institution type
   */
  get institutionType(): 'clinic' | 'resident' | null {
    return this._institutionType();
  }

  /**
   * Get plan type
   */
  get planType(): string {
    return this._planType();
  }

  /**
   * Set user data from signup form (NOT created in DB yet)
   */
  setUserData(email: string, password: string, role: string): void {
    this._email.set(email);
    this._password.set(password);
    this._role.set(role);
  }

  /**
   * Set admin data from signup form
   */
  setAdminData(firstName: string, lastName: string): void {
    this._adminFirstName.set(firstName);
    this._adminLastName.set(lastName);
  }

  /**
   * Set institution data from institution details form
   */
  setInstitutionData(name: string, type: 'clinic' | 'resident'): void {
    this._institutionName.set(name);
    this._institutionType.set(type);
  }

  /**
   * Set plan type (for relative users)
   */
  setPlanType(planType: string): void {
    this._planType.set(planType);
  }

  /**
   * Clear all registration flow data
   */
  clear(): void {
    this._email.set('');
    this._password.set('');
    this._role.set('');
    this._adminFirstName.set('');
    this._adminLastName.set('');
    this._institutionName.set('');
    this._institutionType.set(null);
    this._planType.set('');
  }

  /**
   * Check if all required data is available for creating user, organization and admin
   */
  isComplete(): boolean {
    if (this._role() === 'admin') {
      // For admin: need email, password, firstName, lastName, institutionName, institutionType
      return !!(
        this._email() &&
        this._password() &&
        this._adminFirstName() &&
        this._adminLastName() &&
        this._institutionName() &&
        this._institutionType()
      );
    } else if (this._role() === 'relative') {
      // For relative: need email, password (firstName and lastName are optional for now)
      return !!(
        this._email() &&
        this._password()
      );
    }
    return false;
  }
}

