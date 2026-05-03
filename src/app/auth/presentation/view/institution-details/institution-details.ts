import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';
import { AuthApi } from '../../../infrastructure/auth-api';
import { catchError, map, of, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-institution-details',
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
  templateUrl: './institution-details.html',
  styleUrl: './institution-details.css'
})
export class InstitutionDetailsComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private registrationFlowStore = inject(RegistrationFlowStore);
  private authApi = inject(AuthApi);

  institutionForm: FormGroup;
  selectedInstitutionType: 'clinic' | 'resident' | null = null;

  private readonly institutionNameAvailabilityValidator: AsyncValidatorFn = (control: AbstractControl) => {
    const name = (control.value ?? '').toString().trim();
    if (!name) {
      return of(null);
    }
    return timer(400).pipe(
      switchMap(() =>
        this.authApi.isOrganizationNameAvailable(name).pipe(
          map((available) => (available ? null : { institutionNameTaken: true })),
          catchError(() => of(null))
        )
      )
    );
  };

  constructor() {
    this.institutionForm = this.fb.group({
      institutionName: ['', [Validators.required], [this.institutionNameAvailabilityValidator]],
      institutionType: ['', [Validators.required]]
    });
  }

  /**
   * Select institution type
   */
  selectInstitutionType(type: 'clinic' | 'resident'): void {
    this.selectedInstitutionType = type;
    this.institutionForm.patchValue({ institutionType: type });
  }

  onSubmit(): void {
    if (this.institutionForm.pending) {
      return;
    }
    if (this.institutionForm.invalid) {
      this.institutionForm.markAllAsTouched();
      if (!this.selectedInstitutionType) {
        this.institutionForm.get('institutionType')?.markAsTouched();
      }
      return;
    }

    const { institutionName, institutionType } = this.institutionForm.value;
    this.registrationFlowStore.setInstitutionData(institutionName, institutionType);

    this.router.navigate(['billing-information'], { relativeTo: this.route.parent });
  }

  goBack(): void {
    this.router.navigate(['../subscription-selection'], { relativeTo: this.route.parent });
  }
}
