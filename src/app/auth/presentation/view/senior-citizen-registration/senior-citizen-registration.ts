import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../application/auth.store';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';
import { OrganizationApi } from '../../../../organization/infrastructure/organization-api';
import { RelativesApi } from '../../../../relatives/infrastructure/relatives-api';
import { SeniorCitizen } from '../../../../organization/domain/model/senior-citizen.entity';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { map, switchMap, of } from 'rxjs';

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

  form: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  userId: number | null = null;

  genderOptions = [
    { value: 'male', label: 'senior-citizen-registration.gender.male' },
    { value: 'female', label: 'senior-citizen-registration.gender.female' },
    { value: 'other', label: 'senior-citizen-registration.gender.other' }
  ];

  constructor() {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      birthDate: ['', Validators.required],
      gender: ['', Validators.required],
      dni: ['', Validators.required],
      deviceId: [null, [Validators.required, Validators.min(0)]],
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
    
    // Get planType from registration flow store
    const planType = this.registrationFlowStore.planType || 'freemium';
    const currentUser = this.authStore.currentUser();
    const tokenSignal = this.authStore.token;
    const token = tokenSignal();
    
    console.log('[SeniorCitizenRegistration] Current user:', currentUser);
    console.log('[SeniorCitizenRegistration] Has token:', !!token);
    console.log('[SeniorCitizenRegistration] Token length:', token?.length || 0);
    console.log('[SeniorCitizenRegistration] Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('[SeniorCitizenRegistration] Plan type:', planType);
    
    // Verify token is available
    if (!token) {
      console.error('[SeniorCitizenRegistration] No token available! User needs to log in again.');
      this.errorMessage = 'Authentication error. Please log in again.';
      this.isLoading = false;
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Create senior citizen
    this.organizationApi.createSeniorCitizen(seniorCitizen).pipe(
      switchMap(createdSeniorCitizen => {
        console.log('[SeniorCitizenRegistration] Senior citizen created:', createdSeniorCitizen);
        
        // Note: The backend now assigns a default organization for relatives (organizationId = 0)
        // The created senior citizen will have a real organizationId, but it belongs to the "Individual Users" organization
        console.log('[SeniorCitizenRegistration] Senior citizen created with organizationId:', createdSeniorCitizen.organizationId);
        
        // Create relative entity with planType and seniorCitizenId
        const relativeUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderRelativesEndpointPath}`;
        
        // Extract name from email (e.g., "john.doe@example.com" -> "john.doe")
        const emailName = currentUser?.email?.split('@')[0] || 'user';
        const nameParts = emailName.split('.');
        const firstName = nameParts[0] || emailName;
        const lastName = nameParts.slice(1).join(' ') || 'N/A'; // Use "N/A" if no last name found
        
        const relativeData = {
          userId: this.userId,
          firstName: firstName,
          lastName: lastName, // Backend requires non-empty lastName
          phoneNumber: 'N/A', // Backend requires non-empty phoneNumber (can be updated later)
          planType: planType.toUpperCase(), // Backend expects 'FREEMIUM' or 'PREMIUM'
          seniorCitizenId: createdSeniorCitizen.id
        };
        
        console.log('[SeniorCitizenRegistration] Creating relative:', relativeData);
        
        return this.http.post(relativeUrl, relativeData).pipe(
          map(() => {
            console.log('[SeniorCitizenRegistration] Relative created successfully');
            // Clear registration flow store
            this.registrationFlowStore.clear();
            return createdSeniorCitizen;
          })
        );
      })
    ).subscribe({
      next: (seniorCitizen) => {
        console.log('[SeniorCitizenRegistration] Senior citizen registered and relative created');
        // Redirect to relative routes
        this.router.navigate(['/relative/relative', this.userId]);
      },
      error: (error) => {
        console.error('[SeniorCitizenRegistration] Error registering senior citizen:', error);
        console.error('[SeniorCitizenRegistration] Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        
        // Provide more specific error message
        let errorMsg = 'Failed to register senior citizen. Please try again.';
        
        // Check for duplicate deviceId error
        const errorMessage = error.message || error.error?.message || error.error || '';
        const errorStr = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
        
        // Check for duplicate entry errors (deviceId is unique in the database)
        if (errorStr.includes('Duplicate entry') && (errorStr.includes('device_id') || errorStr.includes('deviceId') || errorStr.includes('senior_citizens'))) {
          errorMsg = 'The device ID is already in use. Please use a different device ID.';
        } else if (error.status === 401 || error.status === 403) {
          errorMsg = 'Authentication error. Please log in again.';
        } else if (error.status === 404) {
          errorMsg = 'Service not found. Please contact support.';
        } else if (error.status === 400) {
          // Try to extract a more specific message from the backend
          const backendMsg = error.error?.message || error.error || errorMessage;
          if (typeof backendMsg === 'string' && backendMsg.length > 0) {
            errorMsg = backendMsg;
          } else {
            errorMsg = 'Invalid data. Please check the form and try again.';
          }
        } else if (error.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        this.errorMessage = errorMsg;
        this.isLoading = false;
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/auth/login']);
  }
}

