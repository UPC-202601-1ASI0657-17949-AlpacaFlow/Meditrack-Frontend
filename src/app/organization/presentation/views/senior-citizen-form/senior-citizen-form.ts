import { Component, EventEmitter, Input, Output, OnChanges, SimpleChange, SimpleChanges } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { OrganizationStore } from '../../../application/organization.store';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';

/** Construye Date UTC mediodía desde YYYY-MM-DD del input type="date". */
function parseBirthDateFromForm(value: string): Date | null {
  const raw = (value ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) {
    return null;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (y < 1880 || y > 2120 || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return null;
  }
  const t = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  const endToday = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 23, 59, 59);
  if (dt.getTime() > endToday) {
    return null;
  }
  return dt;
}

const SENIOR_MIN_AGE = 60;
const SENIOR_MAX_AGE = 120;
const WEIGHT_MIN_KG = 25;
const WEIGHT_MAX_KG = 250;
const HEIGHT_MIN_CM = 120;
const HEIGHT_MAX_CM = 220;
const DNI_PATTERN = /^[0-9]{1,8}$/;

function computeAgeYears(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

@Component({
  selector: 'app-senior-citizen-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatInputModule, TranslatePipe],
  templateUrl: './senior-citizen-form.html',
  styleUrls: ['./senior-citizen-form.css']
})
export class SeniorCitizenForm implements OnChanges {
  @Input() seniorCitizen: SeniorCitizen | null = null;
  @Output() saved = new EventEmitter<SeniorCitizen>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  /** Clave i18n para errores de validación local o del API (mostrada en el formulario). */
  formErrorKey: string | null = null;
  /** Parámetros opcionales para el pipe translate (p. ej. maxValue). */
  formErrorParams: Record<string, string> | null = null;
  submitInProgress = false;

  constructor(private fb: FormBuilder, public organizationStore: OrganizationStore) {
    const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: ['', Validators.required],
      gender: ['', Validators.required],
      weight: [null, [Validators.required, Validators.min(WEIGHT_MIN_KG), Validators.max(WEIGHT_MAX_KG)]],
      height: [null, [Validators.required, Validators.min(HEIGHT_MIN_CM), Validators.max(HEIGHT_MAX_CM)]],
      dni: ['', [Validators.required, Validators.pattern(DNI_PATTERN)]],
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)]],
      deviceId: [null, [Validators.required, Validators.min(1)]],
      organizationId: [organizationId]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const ch = changes['seniorCitizen'] as SimpleChange | undefined;
    if (!ch) {
      return;
    }

    if (this.seniorCitizen) {
      this.formErrorKey = null;
      this.formErrorParams = null;
      const birthDateStr = this.seniorCitizen.birthDate.toISOString().split('T')[0];
      this.form.patchValue({
        firstName: this.seniorCitizen.firstName,
        lastName: this.seniorCitizen.lastName,
        birthDate: birthDateStr,
        gender: this.seniorCitizen.gender,
        weight: this.seniorCitizen.weight,
        height: this.seniorCitizen.height,
        dni: this.seniorCitizen.dni,
        imageUrl: this.seniorCitizen.imageUrl,
        deviceId: this.seniorCitizen.deviceId,
        organizationId: this.seniorCitizen.organizationId
      });
      return;
    }

    const prev = ch.previousValue;
    const enteringCreateFromEdit = prev != null;
    const firstOpen = ch.isFirstChange();
    if (enteringCreateFromEdit || firstOpen) {
      this.formErrorKey = null;
      this.formErrorParams = null;
      const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
      this.form.reset();
      this.form.patchValue({ organizationId });
    }
  }

  onSubmit(): void {
    this.formErrorKey = null;
    this.formErrorParams = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const organizationId = this.organizationStore.getCurrentOrganizationId();
    if (!organizationId || organizationId === 0) {
      this.formErrorKey = 'senior-citizen.errors.noOrganizationContext';
      return;
    }

    const birthParsed = parseBirthDateFromForm(this.form.value.birthDate as string);
    if (!birthParsed) {
      this.formErrorKey = 'senior-citizen.errors.invalidBirthDate';
      this.form.get('birthDate')?.setErrors({ invalidDate: true });
      this.form.get('birthDate')?.markAsTouched();
      return;
    }

    const ageYears = computeAgeYears(birthParsed);
    if (ageYears < SENIOR_MIN_AGE || ageYears > SENIOR_MAX_AGE) {
      this.formErrorKey = 'senior-citizen.errors.ageOutOfRange';
      this.formErrorParams = {
        minAge: String(SENIOR_MIN_AGE),
        maxAge: String(SENIOR_MAX_AGE)
      };
      this.form.get('birthDate')?.setErrors({ ageOutOfRange: true });
      this.form.get('birthDate')?.markAsTouched();
      return;
    }
    const birthCtrl = this.form.get('birthDate');
    if (birthCtrl?.errors) {
      const next: Record<string, unknown> = { ...birthCtrl.errors };
      delete next['ageOutOfRange'];
      delete next['invalidDate'];
      birthCtrl.setErrors(Object.keys(next).length ? next : null);
    }

    const deviceId = Number(this.form.value.deviceId);
    const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
    if (isNaN(deviceId) || deviceId <= 0) {
      this.formErrorKey = 'senior-citizen.errors.deviceIdInvalid';
      return;
    }
    if (deviceId > MAX_SAFE_INTEGER) {
      this.formErrorKey = 'senior-citizen.deviceIdTooLarge';
      this.formErrorParams = { maxValue: MAX_SAFE_INTEGER.toLocaleString() };
      return;
    }

    const seniorCitizen = new SeniorCitizen({
      id: this.seniorCitizen ? this.seniorCitizen.id : 0,
      organizationId,
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      birthDate: birthParsed,
      gender: this.form.value.gender,
      weight: Number(this.form.value.weight),
      height: Number(this.form.value.height),
      dni: String(this.form.value.dni).trim(),
      imageUrl: this.form.value.imageUrl || '/assets/default-senior-citizen.png',
      deviceId
    });

    const request$ = this.seniorCitizen
      ? this.organizationStore.updateSeniorCitizen(seniorCitizen)
      : this.organizationStore.addSeniorCitizen(seniorCitizen);

    this.submitInProgress = true;
    request$.pipe(finalize(() => (this.submitInProgress = false))).subscribe({
      next: saved => {
        this.formErrorKey = null;
        this.formErrorParams = null;
        this.saved.emit(saved);
      },
      error: (err: unknown) => {
        this.formErrorParams = null;
        this.formErrorKey = this.mapSeniorCitizenApiError(err);
      }
    });
  }

  private mapSeniorCitizenApiError(err: unknown): string {
    const haystack = this.extractErrorHaystack(err);
    if (err instanceof HttpErrorResponse && err.status === 409 && typeof err.error === 'string') {
      const body = err.error.trim();
      if (body === 'MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED') {
        return 'senior-citizen.errors.deviceAlreadyAssigned';
      }
      if (body === 'MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI') {
        return 'senior-citizen.errors.duplicateDni';
      }
      if (body === 'MEDITRACK_SENIOR_CITIZEN_DUPLICATE_FULL_NAME') {
        return 'senior-citizen.errors.duplicateFullName';
      }
    }
    if (haystack.includes('MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED')) {
      return 'senior-citizen.errors.deviceAlreadyAssigned';
    }
    if (
      haystack.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI') ||
      haystack.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_FULL_NAME')
    ) {
      return haystack.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI')
        ? 'senior-citizen.errors.duplicateDni'
        : 'senior-citizen.errors.duplicateFullName';
    }
    if (
      haystack.includes('birthDate') ||
      haystack.includes('Cannot deserialize') ||
      haystack.includes('Failed to parse Date') ||
      haystack.includes('Date value') ||
      haystack.includes('Invalid birthDate') ||
      haystack.includes('Birth date') ||
      haystack.includes('out of range') ||
      haystack.includes('calendar date')
    ) {
      return 'senior-citizen.errors.invalidBirthDateServer';
    }
    if (
      haystack.includes('Age derived from birth date') ||
      haystack.includes('between 60 and 120') ||
      haystack.includes('Gender must be Masculino') ||
      haystack.includes('Weight must be between') ||
      haystack.includes('Height must be between') ||
      haystack.includes('DNI must contain only digits')
    ) {
      return 'senior-citizen.errors.validationServer';
    }
    if (haystack.includes('Invalid request:')) {
      return 'senior-citizen.errors.validationServer';
    }
    if (haystack.includes('Http failure') || haystack.includes('Failed to create') || haystack.includes('Failed to update')) {
      return 'senior-citizen.errors.saveFailed';
    }
    return 'senior-citizen.errors.saveFailed';
  }

  private extractErrorHaystack(err: unknown): string {
    const parts: string[] = [];
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string') {
        parts.push(err.error);
      } else if (err.error != null && typeof err.error === 'object') {
        parts.push(JSON.stringify(err.error));
      }
      parts.push(err.message);
    } else if (err instanceof Error) {
      parts.push(err.message);
    }
    return parts.join(' ');
  }

  onCancel(): void {
    this.formErrorKey = null;
    this.formErrorParams = null;
    this.cancel.emit();
  }
}
