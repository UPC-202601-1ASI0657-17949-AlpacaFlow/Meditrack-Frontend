import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RegistrationFlowStore } from '../../../application/registration-flow.store';

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

  institutionForm: FormGroup;
  selectedInstitutionType: 'clinic' | 'resident' | null = null;

  constructor() {
    this.institutionForm = this.fb.group({
      institutionName: ['', [Validators.required]],
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
    if (this.institutionForm.invalid) {
      this.institutionForm.markAllAsTouched();
      // Mark institutionType as touched if not selected
      if (!this.selectedInstitutionType) {
        this.institutionForm.get('institutionType')?.markAsTouched();
      }
      return;
    }

    // Save institution data temporarily (not created in DB yet)
    const { institutionName, institutionType } = this.institutionForm.value;
    this.registrationFlowStore.setInstitutionData(institutionName, institutionType);
    
    // Redirect to billing information after completing institution details
    this.router.navigate(['billing-information'], { relativeTo: this.route.parent });
  }

  goBack(): void {
    this.router.navigate(['../subscription-selection'], { relativeTo: this.route.parent });
  }
}

