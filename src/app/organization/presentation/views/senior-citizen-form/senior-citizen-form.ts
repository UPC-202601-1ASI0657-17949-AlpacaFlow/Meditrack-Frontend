import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChange, SimpleChanges, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, map, of, switchMap } from 'rxjs';
import { OrganizationStore } from '../../../application/organization.store';
import { Device } from '../../../domain/model/device.entity';
import { SeniorCitizen } from '../../../domain/model/senior-citizen.entity';
import { DeviceApi } from '../../../infrastructure/device-api';
import { OrganizationApi } from '../../../infrastructure/organization-api';
import { readApiHttpError } from '../../../../shared/infrastructure/api-http-error';

type DeviceValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'alreadyAssigned' | 'error';

interface DeviceAssignmentConflict {
  holderId: number;
  patientName: string;
}

interface SeniorCitizenSaveErrorContext {
  deviceId: number;
  originalDeviceId?: number;
}

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
export class SeniorCitizenForm implements OnChanges, OnInit {
  @Input() seniorCitizen: SeniorCitizen | null = null;
  @Output() saved = new EventEmitter<SeniorCitizen>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  /** Clave i18n para errores de validación local o del API (mostrada en el formulario). */
  formErrorKey: string | null = null;
  /** Parámetros opcionales para el pipe translate (p. ej. maxValue). */
  formErrorParams: Record<string, string> | null = null;
  submitInProgress = false;

  deviceValidationStatus = signal<DeviceValidationStatus>('idle');
  deviceValidationParams = signal<Record<string, string> | null>(null);

  constructor(
    private fb: FormBuilder,
    public organizationStore: OrganizationStore,
    private deviceApi: DeviceApi,
    private organizationApi: OrganizationApi
  ) {
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

  ngOnInit(): void {
    this.form.get('deviceId')?.valueChanges.subscribe(() => {
      this.deviceValidationStatus.set('idle');
      this.deviceValidationParams.set(null);
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

    if (this.deviceValidationStatus() === 'alreadyAssigned') {
      this.formErrorKey = 'senior-citizen.errors.deviceAlreadyAssigned';
      this.formErrorParams = null;
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

    const saveErrorContext: SeniorCitizenSaveErrorContext = {
      deviceId,
      originalDeviceId: this.seniorCitizen?.deviceId
    };

    this.submitInProgress = true;
    this.organizationApi
      .getSeniorCitizensByOrganization(organizationId)
      .pipe(
        catchError(() => of(this.organizationStore.seniorCitizens())),
        switchMap(seniors => {
          const mergedSeniors = seniors.length > 0 ? seniors : this.organizationStore.seniorCitizens();
          const deviceConflict = this.findDeviceAssignmentConflictInList(deviceId, mergedSeniors);
          if (deviceConflict) {
            this.formErrorKey = 'senior-citizen.errors.deviceAlreadyAssigned';
            this.formErrorParams = null;
            this.markDeviceAlreadyAssigned(deviceConflict);
            return EMPTY;
          }
          return this.deviceApi.getDeviceById(deviceId, { fresh: true }).pipe(
            switchMap(device => {
              const holderConflict = this.findHolderAssignmentConflictInList(device, mergedSeniors);
              if (holderConflict) {
                this.formErrorKey = 'senior-citizen.errors.deviceAlreadyAssigned';
                this.formErrorParams = null;
                this.markDeviceAlreadyAssigned(holderConflict);
                return EMPTY;
              }
              return request$;
            }),
            catchError(() => request$) // 404: device not in cloud yet; organization registers it after save
          );
        }),
        finalize(() => (this.submitInProgress = false))
      )
      .subscribe({
      next: saved => {
        this.formErrorKey = null;
        this.formErrorParams = null;
        this.saved.emit(saved);
      },
      error: (err: unknown) => {
        const mapped = this.mapSeniorCitizenApiError(err, saveErrorContext);
        this.formErrorKey = mapped.key;
        this.formErrorParams = mapped.params;
        if (mapped.key === 'senior-citizen.errors.deviceAlreadyAssigned') {
          const localConflict = this.findDeviceAssignmentConflict(deviceId);
          if (localConflict) {
            this.markDeviceAlreadyAssigned(localConflict);
          } else {
            this.deviceApi.getDeviceById(deviceId, { fresh: true }).subscribe({
              next: device => {
                this.markDeviceAlreadyAssigned(
                  this.findHolderAssignmentConflict(device) ?? { holderId: device.holderId, patientName: '' }
                );
              },
              error: () => this.markDeviceAlreadyAssigned(null)
            });
          }
        }
      }
    });
  }

  private mapSeniorCitizenApiError(
    err: unknown,
    context?: SeniorCitizenSaveErrorContext
  ): { key: string; params: Record<string, string> | null } {
    const haystack = this.extractErrorHaystack(err);
    if (this.isDeviceNotFoundError(err, haystack)) {
      return {
        key: 'senior-citizen.errors.deviceNotFound',
        params: context ? { deviceId: String(context.deviceId) } : null
      };
    }
    if (this.isServiceUnavailableError(err, haystack)) {
      return { key: 'senior-citizen.errors.serviceUnavailable', params: null };
    }
    if (this.isDeviceAlreadyAssignedError(err, haystack)) {
      return { key: 'senior-citizen.errors.deviceAlreadyAssigned', params: null };
    }
    if (err instanceof HttpErrorResponse && err.status === 409 && typeof err.error === 'string') {
      const body = err.error.trim();
      if (body === 'MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI') {
        return { key: 'senior-citizen.errors.duplicateDni', params: null };
      }
      if (body === 'MEDITRACK_SENIOR_CITIZEN_DUPLICATE_FULL_NAME') {
        return { key: 'senior-citizen.errors.duplicateFullName', params: null };
      }
    }
    if (err instanceof HttpErrorResponse && err.status === 409 && err.error != null && typeof err.error === 'object') {
      const code = String((err.error as { code?: string }).code ?? '');
      if (code === 'MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI') {
        return { key: 'senior-citizen.errors.duplicateDni', params: null };
      }
      if (code === 'MEDITRACK_SENIOR_CITIZEN_DUPLICATE_FULL_NAME') {
        return { key: 'senior-citizen.errors.duplicateFullName', params: null };
      }
    }
    if (
      haystack.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI') ||
      haystack.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_FULL_NAME')
    ) {
      return {
        key: haystack.includes('MEDITRACK_SENIOR_CITIZEN_DUPLICATE_DNI')
          ? 'senior-citizen.errors.duplicateDni'
          : 'senior-citizen.errors.duplicateFullName',
        params: null
      };
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
      return { key: 'senior-citizen.errors.invalidBirthDateServer', params: null };
    }
    if (
      haystack.includes('Age derived from birth date') ||
      haystack.includes('between 60 and 120') ||
      haystack.includes('Gender must be Masculino') ||
      haystack.includes('Weight must be between') ||
      haystack.includes('Height must be between') ||
      haystack.includes('DNI must contain only digits')
    ) {
      return { key: 'senior-citizen.errors.validationServer', params: null };
    }
    if (haystack.includes('Invalid request:')) {
      return { key: 'senior-citizen.errors.validationServer', params: null };
    }
    if (haystack.includes('Http failure') || haystack.includes('Failed to create') || haystack.includes('Failed to update')) {
      return { key: 'senior-citizen.errors.saveFailed', params: null };
    }
    return { key: 'senior-citizen.errors.saveFailed', params: null };
  }

  private isDeviceNotFoundError(err: unknown, haystack?: string): boolean {
    const apiErr = readApiHttpError(err);
    if (apiErr?.status === 404) {
      return true;
    }
    if (err instanceof HttpErrorResponse && err.status === 404) {
      return true;
    }
    const text = (haystack ?? this.extractErrorHaystack(err)).toLowerCase();
    return (
      /\b404\b/.test(text) ||
      text.includes('resource not found') ||
      text.includes('does not exist in devices context') ||
      text.includes('device does not exist')
    );
  }

  private isServiceUnavailableError(err: unknown, haystack?: string): boolean {
    const apiErr = readApiHttpError(err);
    if (apiErr?.status === 503 || apiErr?.status === 502 || apiErr?.status === 504) {
      return true;
    }
    if (err instanceof HttpErrorResponse && (err.status === 503 || err.status === 502 || err.status === 504)) {
      return true;
    }
    const text = (haystack ?? this.extractErrorHaystack(err)).toLowerCase();
    return (
      /\b503\b/.test(text) ||
      /\b502\b/.test(text) ||
      /\b504\b/.test(text) ||
      text.includes('service unavailable') ||
      text.includes('device unavailable')
    );
  }

  private isDeviceAlreadyAssignedError(err: unknown, haystack: string): boolean {
    const apiErr = readApiHttpError(err);
    if (apiErr?.status === 409) {
      const code = (apiErr.code ?? '').toUpperCase();
      if (code === 'DEVICE_ALREADY_ASSIGNED' || code === 'MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED') {
        return true;
      }
      if (code === 'DUPLICATE_DNI' || code === 'DUPLICATE_FULL_NAME') {
        return false;
      }
      const msg = apiErr.message.toLowerCase();
      if (
        msg.includes('device_already_assigned') ||
        msg.includes('already assigned to another senior') ||
        msg.includes('already assigned to another')
      ) {
        return true;
      }
    }
    if (err instanceof HttpErrorResponse && err.status === 409) {
      if (typeof err.error === 'string') {
        const body = err.error.trim();
        if (body === 'MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED') {
          return true;
        }
      } else if (err.error != null && typeof err.error === 'object') {
        const code = String((err.error as { code?: string }).code ?? '');
        if (code === 'DEVICE_ALREADY_ASSIGNED' || code === 'MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED') {
          return true;
        }
      }
    }
    return (
      haystack.includes('DEVICE_ALREADY_ASSIGNED') ||
      haystack.includes('MEDITRACK_SENIOR_CITIZEN_DEVICE_ALREADY_ASSIGNED') ||
      /already assigned to another senior/i.test(haystack)
    );
  }

  private extractErrorHaystack(err: unknown): string {
    const parts: string[] = [];
    const apiErr = readApiHttpError(err);
    if (apiErr) {
      parts.push(apiErr.message);
      if (apiErr.code) {
        parts.push(apiErr.code);
      }
      parts.push(String(apiErr.status));
    } else if (err instanceof HttpErrorResponse) {
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

  validateDevice(): void {
    const deviceId = Number(this.form.value.deviceId);
    if (isNaN(deviceId) || deviceId <= 0) {
      this.deviceValidationStatus.set('invalid');
      this.deviceValidationParams.set(null);
      return;
    }

    this.deviceValidationStatus.set('checking');
    this.deviceValidationParams.set(null);

    this.deviceApi
      .getDeviceById(deviceId, { fresh: true })
      .pipe(
        switchMap(device => this.resolveDeviceAssignmentConflict(deviceId, device)),
        catchError(err => of({ kind: 'deviceError' as const, err }))
      )
      .subscribe(result => {
        if ('conflict' in result && result.conflict) {
          this.markDeviceAlreadyAssigned(result.conflict);
          return;
        }
        if ('kind' in result && result.kind === 'ok') {
          this.deviceValidationStatus.set('valid');
          return;
        }
        if (!('err' in result)) {
          return;
        }
        this.deviceValidationParams.set(null);
        const err = result.err;
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.deviceValidationStatus.set('invalid');
        } else if (err instanceof Error && /not found|404/i.test(err.message)) {
          this.deviceValidationStatus.set('invalid');
        } else {
          this.deviceValidationStatus.set('error');
        }
      });
  }

  private resolveDeviceAssignmentConflict(deviceId: number, device: Device) {
    const storeSeniors = this.organizationStore.seniorCitizens();
    const holderConflict = this.findHolderAssignmentConflictInList(device, storeSeniors);
    if (holderConflict) {
      return of({ conflict: holderConflict });
    }

    const orgId = this.organizationStore.getCurrentOrganizationId();
    const seniors$ = orgId
      ? this.organizationApi.getSeniorCitizensByOrganization(orgId).pipe(
          catchError(() => of(storeSeniors))
        )
      : of(storeSeniors);

    return seniors$.pipe(
      map(seniors => {
        const mergedSeniors = seniors.length > 0 ? seniors : storeSeniors;
        const orgConflict = this.findDeviceAssignmentConflictInList(deviceId, mergedSeniors);
        if (orgConflict) {
          return { conflict: orgConflict };
        }
        const holderWithNames = this.findHolderAssignmentConflictInList(device, mergedSeniors);
        if (holderWithNames) {
          return { conflict: holderWithNames };
        }
        return { kind: 'ok' as const };
      })
    );
  }

  private getCurrentSeniorId(): number {
    return this.seniorCitizen?.id ?? 0;
  }

  private findDeviceAssignmentConflict(deviceId: number): DeviceAssignmentConflict | null {
    return this.findDeviceAssignmentConflictInList(deviceId, this.organizationStore.seniorCitizens());
  }

  private findDeviceAssignmentConflictInList(
    deviceId: number,
    seniors: SeniorCitizen[]
  ): DeviceAssignmentConflict | null {
    const currentSeniorId = this.getCurrentSeniorId();
    const conflict = seniors.find(
      sc => Number(sc.deviceId) === deviceId && sc.id !== currentSeniorId
    );
    if (!conflict) {
      return null;
    }
    return {
      holderId: conflict.id,
      patientName: `${conflict.firstName} ${conflict.lastName}`.trim()
    };
  }

  private findHolderAssignmentConflict(device: Device): DeviceAssignmentConflict | null {
    return this.findHolderAssignmentConflictInList(device, this.organizationStore.seniorCitizens());
  }

  private findHolderAssignmentConflictInList(
    device: Device,
    seniors: SeniorCitizen[]
  ): DeviceAssignmentConflict | null {
    const currentSeniorId = this.getCurrentSeniorId();
    const holderId = this.readDeviceHolderId(device);
    if (!Number.isFinite(holderId) || holderId <= 0 || holderId === currentSeniorId) {
      return null;
    }
    const holder = seniors.find(sc => sc.id === holderId);
    return {
      holderId,
      patientName: holder ? `${holder.firstName} ${holder.lastName}`.trim() : ''
    };
  }

  private readDeviceHolderId(device: Device): number {
    const raw = device.holderId;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private markDeviceAlreadyAssigned(conflict: DeviceAssignmentConflict | null): void {
    this.deviceValidationStatus.set('alreadyAssigned');
    if (conflict?.patientName) {
      this.deviceValidationParams.set({
        patientName: conflict.patientName,
        holderId: String(conflict.holderId)
      });
      return;
    }
    if (conflict && conflict.holderId > 0) {
      this.deviceValidationParams.set({ holderId: String(conflict.holderId), patientName: '' });
      return;
    }
    this.deviceValidationParams.set(null);
  }

  onCancel(): void {
    this.formErrorKey = null;
    this.formErrorParams = null;
    this.cancel.emit();
  }
}
