import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { OrganizationStore } from '../../../application/organization.store';
import { Caregiver } from '../../../domain/model/caregiver.entity';

/** Edad mínima del cuidador (≥ 21 años). */
const CAREGIVER_AGE_MIN = 21;
/** Edad máxima del cuidador (inclusive). */
const CAREGIVER_AGE_MAX = 65;

/** Teléfono: solo dígitos (sin letras ni símbolos). */
function caregiverPhoneDigitsOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) {
      return null;
    }
    if (!/^\d+$/.test(v)) {
      return { phoneDigitsOnly: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-caregiver-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatInputModule, TranslatePipe],
  templateUrl: './caregiver-form.html',
  styleUrls: ['./caregiver-form.css']
})
export class CaregiverForm implements OnChanges {
  @Input() caregiver: Caregiver | null = null;
  @Output() saved = new EventEmitter<Caregiver>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  institutionEmailDomain: string = '';
  invalidSubmitAttempt = false;
  apiErrorKey: string | null = null;
  submitInProgress = false;

  constructor(
    private fb: FormBuilder,
    private organizationStore: OrganizationStore
  ) {
    const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
    this.institutionEmailDomain = this.organizationStore.getInstitutionEmailDomain();

    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      age: [null, [Validators.required, Validators.min(CAREGIVER_AGE_MIN), Validators.max(CAREGIVER_AGE_MAX)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, caregiverPhoneDigitsOnlyValidator()]],
      imageUrl: [
        '',
        [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)]
      ],
      organizationId: [organizationId]
    });

    this.form.get('firstName')?.valueChanges.subscribe(() => {
      if (!this.caregiver) {
        this.generateInstitutionalEmail();
      }
    });

    this.form.get('lastName')?.valueChanges.subscribe(() => {
      if (!this.caregiver) {
        this.generateInstitutionalEmail();
      }
    });
  }

  private generateInstitutionalEmail(): void {
    if (!this.institutionEmailDomain) {
      return;
    }

    const firstName = this.form.get('firstName')?.value?.toLowerCase().trim() || '';
    const lastName = this.form.get('lastName')?.value?.toLowerCase().trim() || '';
    const currentEmail = this.form.get('email')?.value || '';

    if (firstName && lastName) {
      if (currentEmail && currentEmail.includes('@') && !currentEmail.endsWith(this.institutionEmailDomain)) {
        return;
      }

      const normalizedFirstName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedLastName = lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const generatedEmail = `${normalizedFirstName}.${normalizedLastName}${this.institutionEmailDomain}`;

      if (!currentEmail || currentEmail === this.form.get('email')?.value) {
        this.form.patchValue({ email: generatedEmail }, { emitEvent: false });
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const caregiverChange = changes['caregiver'] as SimpleChange | undefined;
    if (!caregiverChange) {
      return;
    }

    this.institutionEmailDomain = this.organizationStore.getInstitutionEmailDomain();

    if (this.caregiver) {
      this.invalidSubmitAttempt = false;
      this.apiErrorKey = null;
      this.form.patchValue({
        firstName: this.caregiver.firstName,
        lastName: this.caregiver.lastName,
        age: this.caregiver.age,
        email: this.caregiver.email,
        phoneNumber: this.caregiver.phoneNumber,
        imageUrl: this.caregiver.imageUrl,
        organizationId: this.caregiver.organizationId
      });
      return;
    }

    const prev = caregiverChange.previousValue;
    const enteringAddFromEdit = prev != null && prev !== undefined;
    const firstOpen = caregiverChange.isFirstChange();

    if (enteringAddFromEdit || firstOpen) {
      this.invalidSubmitAttempt = false;
      this.apiErrorKey = null;
      const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
      this.form.reset();
      this.form.patchValue({ organizationId });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.invalidSubmitAttempt = true;
      this.form.markAllAsTouched();
      return;
    }

    this.invalidSubmitAttempt = false;
    this.apiErrorKey = null;

    const organizationId = this.organizationStore.getCurrentOrganizationId();
    if (!organizationId || organizationId === 0) {
      console.error('Cannot create/update caregiver: No user selected or invalid organizationId');
      return;
    }

    let email = this.form.value.email!.trim();
    if (this.institutionEmailDomain && email) {
      if (!email.includes('@')) {
        email = `${email}${this.institutionEmailDomain}`;
      }
    }

    const caregiverPayload = new Caregiver({
      id: this.caregiver ? this.caregiver.id : 0,
      firstName: this.form.value.firstName!,
      lastName: this.form.value.lastName!,
      age: Number(this.form.value.age),
      email: email,
      phoneNumber: this.form.value.phoneNumber!.toString().trim(),
      imageUrl:
        this.form.value.imageUrl ||
        'https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=Caregiver',
      organizationId: organizationId
    });

    const request$ = this.caregiver
      ? this.organizationStore.updateCaregiver(caregiverPayload)
      : this.organizationStore.addCaregiver(caregiverPayload);

    this.submitInProgress = true;
    request$.pipe(finalize(() => (this.submitInProgress = false))).subscribe({
      next: savedCaregiver => {
        this.apiErrorKey = null;
        this.saved.emit(savedCaregiver);
      },
      error: (err: unknown) => {
        this.apiErrorKey = this.mapServerCaregiverError(err);
      }
    });
  }

  private mapServerCaregiverError(err: unknown): string {
    const chunks: string[] = [];
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string') {
        chunks.push(err.error);
      } else if (err.error != null && typeof err.error === 'object' && 'message' in err.error) {
        chunks.push(String((err.error as { message: unknown }).message));
      }
      chunks.push(err.message);
    } else if (err instanceof Error) {
      chunks.push(err.message);
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
      chunks.push(String((err as { message: unknown }).message));
    }
    const haystack = chunks.join(' ');
    if (
      haystack.includes('MEDITRACK_CAREGIVER_DUPLICATE_EMAIL') ||
      haystack.includes('MEDITRACK_CAREGIVER_DUPLICATE_FULL_NAME')
    ) {
      return 'caregiver.errors.duplicateRegistration';
    }
    return 'caregiver.errors.saveFailed';
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
