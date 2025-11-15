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
    const lastName = fullNameParts.slice(1).join(' ') || '';
    
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

    // Get planType from registration flow store
    const planType = this.registrationFlowStore.planType || 'freemium';
    const currentUser = this.authStore.currentUser();
    
    // Create senior citizen
    this.organizationApi.createSeniorCitizen(seniorCitizen).pipe(
      switchMap(createdSeniorCitizen => {
        console.log('[SeniorCitizenRegistration] Senior citizen created:', createdSeniorCitizen);
        
        // Validate that the created senior citizen has organizationId = 0 (security check)
        if (createdSeniorCitizen.organizationId !== 0) {
          console.error('[SeniorCitizenRegistration] Security violation: Created senior citizen has organizationId', createdSeniorCitizen.organizationId, 'instead of 0');
          throw new Error('Invalid senior citizen configuration. Please contact support.');
        }
        
        // Create relative entity with planType and seniorCitizenId
        const relativeUrl = `${environment.platformProviderApiBaseUrl}/relatives`;
        const relativeData = {
          userId: this.userId,
          firstName: currentUser?.email?.split('@')[0] || '',
          lastName: '',
          email: currentUser?.email || '',
          password: this.registrationFlowStore.password,
          role: 'relative',
          planType: planType,
          creditCard: null,
          expirationDate: null,
          securityCode: null,
          seniorCitizenId: createdSeniorCitizen.id
        };
        
        return this.http.post(relativeUrl, relativeData).pipe(
          map(() => {
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
        this.errorMessage = 'Failed to register senior citizen. Please try again.';
        this.isLoading = false;
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/auth/login']);
  }
}

