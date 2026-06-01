import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';
import { OrganizationApi } from '../../../../organization/infrastructure/organization-api';
import { RelativesApi } from '../../../../relatives/infrastructure/relatives-api';
import { SeniorCitizen } from '../../../../organization/domain/model/senior-citizen.entity';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-senior-citizen-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './senior-citizen-registration.html',
  styleUrl: './senior-citizen-registration.css'
})
export class SeniorCitizenRegistrationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);
  private registrationFlowStore = inject(RegistrationFlowStore);
  private organizationApi = inject(OrganizationApi);
  private relativesApi = inject(RelativesApi);
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  form: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  userId: number | null = null;
  pendingSeniorCitizenId: number | null = null;

  private static readonly PENDING_SENIOR_CITIZEN_STORAGE_KEY = 'meditrack.pendingSeniorCitizenRegistration';

  genderOptions = [
    { value: 'Masculino', label: 'senior-citizen-registration.gender.male' },
    { value: 'Femenino', label: 'senior-citizen-registration.gender.female' }
  ];

  constructor() {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      birthDate: ['', Validators.required],
      gender: ['', Validators.required],
      dni: ['', Validators.required],
      deviceId: [null, [Validators.required, Validators.min(1)]],
      weight: [null, [Validators.required, Validators.min(0)]],
      height: [null, [Validators.required, Validators.min(0)]],
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)]]
    });
  }

  ngOnInit(): void {
    // Get userId from auth store
    const currentUser = this.authStore.currentUser();
    if (!currentUser) {
      console.error('[SeniorCitizenRegistration] No user found in auth store');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.userId = currentUser.id;
    this.restorePendingSeniorCitizenId();
    console.log('[SeniorCitizenRegistration] Component initialized for userId:', this.userId);
    
    // Check if user already has a relative with senior citizen registered
    // Only redirect if they already have a senior citizen (registration is complete)
    // If they don't have a relative yet (404) or don't have a senior citizen, show the form
    this.relativesApi.getRelativeByUserId(this.userId).subscribe({
      next: (relative) => {
        console.log('[SeniorCitizenRegistration] Relative found:', relative);
        if (relative && relative.seniorCitizen) {
          console.log('[SeniorCitizenRegistration] User already has a relative and senior citizen registered. Redirecting to profile.');
          // User already completed registration, redirect to their profile
          this.router.navigate(['/relative/relative', this.userId]);
        } else if (relative && !relative.seniorCitizen) {
          console.log('[SeniorCitizenRegistration] User has a relative but no senior citizen yet. Showing registration form.');
          // User has a relative entity but no senior citizen - show form to complete registration
        } else {
          console.log('[SeniorCitizenRegistration] User does not have a relative yet. Showing registration form.');
          // User doesn't have a relative yet, show the form
        }
      },
      error: (error) => {
        // If error is 404, it means the user doesn't have a relative yet, which is expected during registration
        // This is the normal case for new users - show the form so they can register
        if (error.status === 404) {
          console.log('[SeniorCitizenRegistration] No relative found for user (404). This is expected for new registrations. Showing registration form.');
        } else {
          console.error('[SeniorCitizenRegistration] Error checking for existing relative:', error);
          // On other errors, still show the form (user can try to register)
          console.log('[SeniorCitizenRegistration] Showing registration form despite error.');
        }
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.userId) {
      this.errorMessage = 'User ID not found';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    if (this.pendingSeniorCitizenId) {
      this.completeRelativeLink(this.pendingSeniorCitizenId);
      return;
    }

    // Split fullName into firstName and lastName
    const fullNameParts = this.form.value.fullName.trim().split(/\s+/);
    const firstName = fullNameParts[0] || '';
    // If no lastName provided, use "N/A" as default (backend requires non-empty lastName)
    const lastName = fullNameParts.slice(1).join(' ').trim() || 'N/A';
    
    // Get birthDate from form (already in YYYY-MM-DD format from date input)
    const birthDateString = this.form.value.birthDate;
    
    // Validate birthDate is provided
    if (!birthDateString) {
      this.errorMessage = 'Birth date is required';
      this.isLoading = false;
      return;
    }
    
    // Parse birthDate string to Date object
    const birthDateObj = new Date(birthDateString + 'T00:00:00.000Z'); // Add time to avoid timezone issues
    
    // Validate the date is valid
    if (isNaN(birthDateObj.getTime())) {
      this.errorMessage = 'Invalid birth date';
      this.isLoading = false;
      return;
    }
    
    // Validate birthDate is not in the future
    const today = new Date();
    if (birthDateObj > today) {
      this.errorMessage = 'Birth date cannot be in the future';
      this.isLoading = false;
      return;
    }
    
    // Validate birthDate is reasonable (not too old)
    const minYear = 1900;
    if (birthDateObj.getFullYear() < minYear) {
      this.errorMessage = `Birth date must be after ${minYear}`;
      this.isLoading = false;
      return;
    }
    
    // Calculate age from birthDate (same logic as in SeniorCitizen entity)
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    // Validate calculated age is reasonable
    if (age < 0 || age > 150) {
      this.errorMessage = 'Invalid birth date: age would be out of range';
      this.isLoading = false;
      return;
    }
    
    // Ensure birthDate is in YYYY-MM-DD format (from date input it should already be)
    const birthDate = birthDateString;
    
    console.log('[SeniorCitizenRegistration] Using birthDate from form:', {
      birthDateString: birthDate,
      birthDateObj: birthDateObj,
      calculatedAge: age
    });
    
    // Ensure all numeric values are proper numbers (not strings or scientific notation)
    const deviceId = Math.floor(Number(this.form.value.deviceId));
    const weight = Number(this.form.value.weight);
    const height = Number(this.form.value.height);
    const ageNum = Math.floor(age);
    
    // Validate numeric values
    if (isNaN(deviceId) || deviceId <= 0) {
      this.errorMessage = 'Device ID must be a positive number';
      this.isLoading = false;
      return;
    }
    
    // Validate deviceId is within safe integer range (JavaScript Number.MAX_SAFE_INTEGER)
    const MAX_SAFE_INTEGER = 9007199254740991; // Number.MAX_SAFE_INTEGER
    if (deviceId > MAX_SAFE_INTEGER) {
      this.errorMessage = this.translate.instant('senior-citizen-registration.deviceIdTooLarge', {
        maxValue: MAX_SAFE_INTEGER.toLocaleString()
      });
      this.isLoading = false;
      return;
    }
    
    if (isNaN(weight) || weight <= 0) {
      this.errorMessage = 'Weight must be a positive number';
      this.isLoading = false;
      return;
    }
    
    if (isNaN(height) || height <= 0) {
      this.errorMessage = 'Height must be a positive number';
      this.isLoading = false;
      return;
    }
    
    console.log('[SeniorCitizenRegistration] Creating senior citizen with values:', {
      birthDate: birthDate,
      birthDateType: typeof birthDate,
      calculatedAge: ageNum,
      deviceId: deviceId,
      deviceIdType: typeof deviceId,
      weight: weight,
      height: height
    });
    
    // Create senior citizen with organizationId = 0 (special case for relatives)
    // This ensures that senior-citizens of relatives are always distinguished from those of organizations
    // Organizations have organizationId > 0, relatives have organizationId = 0
    const seniorCitizen = new SeniorCitizen({
      id: 0,
      organizationId: 0, // Always 0 for relatives - this is enforced for security
      firstName: firstName,
      lastName: lastName,
      birthDate: birthDate, // Pass as string YYYY-MM-DD
      age: ageNum,
      gender: this.form.value.gender,
      weight: weight,
      height: height,
      dni: this.form.value.dni,
      imageUrl: this.form.value.imageUrl || '/assets/default-senior-citizen.png',
      deviceId: deviceId
    });
    
    // Validate that organizationId is 0 (security check)
    if (seniorCitizen.organizationId !== 0) {
      console.error('[SeniorCitizenRegistration] Security violation: organizationId must be 0 for relatives');
      this.errorMessage = 'Invalid configuration. Please contact support.';
      this.isLoading = false;
      return;
    }

    console.log('[SeniorCitizenRegistration] Creating senior citizen:', seniorCitizen);
    // Don't use JSON.stringify on the entity directly as it will serialize Date objects incorrectly
    // Instead, log the important fields
    console.log('[SeniorCitizenRegistration] Senior citizen data:', {
      id: seniorCitizen.id,
      organizationId: seniorCitizen.organizationId,
      firstName: seniorCitizen.firstName,
      lastName: seniorCitizen.lastName,
      birthDate: seniorCitizen.birthDate instanceof Date ? seniorCitizen.birthDate.toISOString() : seniorCitizen.birthDate,
      age: seniorCitizen.age,
      gender: seniorCitizen.gender,
      weight: seniorCitizen.weight,
      height: seniorCitizen.height,
      dni: seniorCitizen.dni,
      imageUrl: seniorCitizen.imageUrl,
      deviceId: seniorCitizen.deviceId
    });
    
    // Verify token is available
    const token = this.authStore.token();
    if (!token) {
      console.error('[SeniorCitizenRegistration] No token available! User needs to log in again.');
      this.errorMessage = 'Authentication error. Please log in again.';
      this.isLoading = false;
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Create senior citizen, then link the relative account
    this.organizationApi.createSeniorCitizen(seniorCitizen).pipe(
      switchMap(createdSeniorCitizen => {
        console.log('[SeniorCitizenRegistration] Senior citizen created:', createdSeniorCitizen);
        console.log('[SeniorCitizenRegistration] Senior citizen created with organizationId:', createdSeniorCitizen.organizationId);

        this.persistPendingSeniorCitizenId(createdSeniorCitizen.id);
        const { relativeData, relativeUrl } = this.buildRelativePayload(createdSeniorCitizen.id);

        console.log('[SeniorCitizenRegistration] Creating relative:', relativeData);

        return this.http.post(relativeUrl, relativeData).pipe(
          map(() => {
            console.log('[SeniorCitizenRegistration] Relative created successfully');
            this.clearPendingSeniorCitizenId();
            this.registrationFlowStore.clear();
            return createdSeniorCitizen;
          })
        );
      })
    ).subscribe({
      next: () => {
        console.log('[SeniorCitizenRegistration] Senior citizen registered and relative created');
        this.router.navigate(['/relative/relative', this.userId]);
      },
      error: (error) => this.handleRegistrationError(error)
    });
  }

  private restorePendingSeniorCitizenId(): void {
    const stored = sessionStorage.getItem(SeniorCitizenRegistrationComponent.PENDING_SENIOR_CITIZEN_STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = Number(stored);
    if (!Number.isNaN(parsed) && parsed > 0) {
      this.pendingSeniorCitizenId = parsed;
    }
  }

  private persistPendingSeniorCitizenId(seniorCitizenId: number): void {
    this.pendingSeniorCitizenId = seniorCitizenId;
    sessionStorage.setItem(
      SeniorCitizenRegistrationComponent.PENDING_SENIOR_CITIZEN_STORAGE_KEY,
      String(seniorCitizenId)
    );
  }

  private clearPendingSeniorCitizenId(): void {
    this.pendingSeniorCitizenId = null;
    sessionStorage.removeItem(SeniorCitizenRegistrationComponent.PENDING_SENIOR_CITIZEN_STORAGE_KEY);
  }

  private buildRelativePayload(seniorCitizenId: number): { relativeUrl: string; relativeData: Record<string, unknown> } {
    const planType = this.registrationFlowStore.planType || 'freemium';
    const currentUser = this.authStore.currentUser();
    const relativeUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderRelativesEndpointPath}`;
    const emailName = currentUser?.email?.split('@')[0] || 'user';
    const nameParts = emailName.split('.');
    const firstName = nameParts[0] || emailName;
    const lastName = nameParts.slice(1).join(' ') || 'N/A';

    return {
      relativeUrl,
      relativeData: {
        userId: this.userId,
        firstName,
        lastName,
        phoneNumber: 'N/A',
        planType: planType.toUpperCase(),
        seniorCitizenId
      }
    };
  }

  private completeRelativeLink(seniorCitizenId: number): void {
    const token = this.authStore.token();
    if (!token) {
      this.errorMessage = 'Authentication error. Please log in again.';
      this.isLoading = false;
      this.router.navigate(['/auth/login']);
      return;
    }

    const { relativeData, relativeUrl } = this.buildRelativePayload(seniorCitizenId);
    this.http.post(relativeUrl, relativeData).subscribe({
      next: () => {
        this.clearPendingSeniorCitizenId();
        this.registrationFlowStore.clear();
        this.router.navigate(['/relative/relative', this.userId]);
      },
      error: (error) => this.handleRegistrationError(error)
    });
  }

  private handleRegistrationError(error: any): void {
    console.error('[SeniorCitizenRegistration] Error registering senior citizen:', error);
    console.error('[SeniorCitizenRegistration] Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      url: error.url
    });

    const extractErrorMessage = (err: any): string => {
      let msg = err?.error?.message || err?.error || err?.message || '';

      if (typeof err?.error === 'string') {
        msg = err.error;
      }

      if (typeof err?.message === 'string' && err.message.includes(':')) {
        const parts = err.message.split(':');
        if (parts.length > 1) {
          msg = parts.slice(1).join(':').trim();
        }
      }

      if (typeof msg === 'string') {
        msg = msg.replace(/^Invalid request:\s*/i, '');
        msg = msg.replace(/^Failed to create senior citizen:\s*/i, '');
        msg = msg.replace(/^Failed to register senior citizen\.\s*Please try again\.\s*$/i, '');
        msg = msg.trim();
      }

      return msg || 'An error occurred. Please try again.';
    };

    let errorMsg = 'Failed to register senior citizen. Please try again.';
    const errorMessage = error.message || error.error?.message || error.error || '';
    const errorStr = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);

    if (this.pendingSeniorCitizenId) {
      errorMsg = 'El paciente ya fue registrado. Pulse Guardar de nuevo para completar el vínculo con su cuenta.';
    } else if (errorStr.includes('out of safe range') || errorStr.includes('out of safe integer range')) {
      if (errorStr.includes('Device ID')) {
        errorMsg = this.translate.instant('senior-citizen-registration.deviceIdTooLarge', {
          maxValue: Number.MAX_SAFE_INTEGER.toLocaleString()
        });
      } else {
        errorMsg = extractErrorMessage(error);
      }
    } else if (errorStr.includes('Duplicate entry') && (errorStr.includes('device_id') || errorStr.includes('deviceId') || errorStr.includes('senior_citizens'))) {
      errorMsg = 'The device ID is already in use. Please use a different device ID.';
    } else if (error.status === 401 || error.status === 403) {
      errorMsg = 'Authentication error. Please log in again.';
    } else if (error?.status === 409) {
      this.restorePendingSeniorCitizenId();
      const body409 = typeof error.error === 'string' ? error.error : '';
      const hay409 = `${body409} ${errorStr}`;
      if (this.pendingSeniorCitizenId && (
        hay409.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI')
        || hay409.includes('MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED')
      )) {
        errorMsg = 'El paciente ya fue registrado. Pulse Guardar de nuevo para completar el vínculo con su cuenta.';
      } else if (hay409.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI')) {
        errorMsg = this.translate.instant('senior-citizen.errors.duplicateDni');
      } else if (hay409.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_FULL_NAME')) {
        errorMsg = this.translate.instant('senior-citizen.errors.duplicateFullName');
      } else if (hay409.includes('MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED')) {
        errorMsg = this.translate.instant('senior-citizen.errors.deviceAlreadyAssigned');
      } else {
        errorMsg = extractErrorMessage(error);
      }
    } else if (error.status === 404) {
      errorMsg = 'Service not found. Please contact support.';
    } else if (error.status === 400) {
      errorMsg = extractErrorMessage(error);
      if (errorMsg === 'An error occurred. Please try again.' || errorMsg.includes('Failed to register')) {
        errorMsg = 'Invalid data. Please check all fields and try again.';
      }
    } else if (error.status === 500) {
      const serverMsg = extractErrorMessage(error);
      if (serverMsg && serverMsg !== 'An error occurred. Please try again.') {
        errorMsg = `Server error: ${serverMsg}`;
      } else {
        errorMsg = 'Server error. Please try again later.';
      }
    } else if (!error.status) {
      errorMsg = extractErrorMessage(error);
      if (!errorMsg || errorMsg === 'An error occurred. Please try again.') {
        errorMsg = error.message || 'An unexpected error occurred. Please check your input and try again.';
      }
    } else {
      errorMsg = extractErrorMessage(error);
    }

    if (!errorMsg || errorMsg.trim().length === 0) {
      errorMsg = 'An unexpected error occurred. Please try again.';
    }

    this.errorMessage = errorMsg;
    this.isLoading = false;
  }

  navigateBack(): void {
    this.router.navigate(['/auth/login']);
  }
}

