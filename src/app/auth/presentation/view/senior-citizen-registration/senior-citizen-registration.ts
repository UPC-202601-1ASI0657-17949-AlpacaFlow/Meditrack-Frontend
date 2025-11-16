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
      age: [null, [Validators.required, Validators.min(0), Validators.max(150)]],
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
      console.error('No user found in auth store');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.userId = currentUser.id;
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
    
    // Calculate birthDate from age
    const today = new Date();
    const birthYear = today.getFullYear() - Number(this.form.value.age);
    const birthDate = new Date(birthYear, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    
    // Create senior citizen with organizationId = 0 (special case for relatives)
    // This ensures that senior-citizens of relatives are always distinguished from those of organizations
    // Organizations have organizationId > 0, relatives have organizationId = 0
    const seniorCitizen = new SeniorCitizen({
      id: 0,
      organizationId: 0, // Always 0 for relatives - this is enforced for security
      firstName: firstName,
      lastName: lastName,
      birthDate: birthDate,
      age: Number(this.form.value.age),
      gender: this.form.value.gender,
      weight: Number(this.form.value.weight),
      height: Number(this.form.value.height),
      dni: this.form.value.dni,
      imageUrl: this.form.value.imageUrl || '/assets/default-senior-citizen.png',
      deviceId: Number(this.form.value.deviceId)
    });
    
    // Validate that organizationId is 0 (security check)
    if (seniorCitizen.organizationId !== 0) {
      console.error('[SeniorCitizenRegistration] Security violation: organizationId must be 0 for relatives');
      this.errorMessage = 'Invalid configuration. Please contact support.';
      this.isLoading = false;
      return;
    }

    console.log('[SeniorCitizenRegistration] Creating senior citizen:', seniorCitizen);
    console.log('[SeniorCitizenRegistration] Senior citizen data:', JSON.stringify(seniorCitizen, null, 2));
    
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

