import { Component, EventEmitter, Input, Output, OnChanges, SimpleChange, SimpleChanges } from '@angular/core';
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
import { Doctor } from "../../../domain/model/doctor.entity";

/** Edad mínima del médico (> 30 años). */
const DOCTOR_AGE_MIN = 31;
/** Edad máxima del médico (inclusive). */
const DOCTOR_AGE_MAX = 75;

/**
 * Especialidad: solo letras (Unicode) y espacios entre palabras; sin números ni otros símbolos.
 */
function specialtyLettersOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) {
      return null;
    }
    if (/[0-9]/.test(v)) {
      return { specialtyHasDigits: true };
    }
    if (!/^[\p{L}]+(?:\s[\p{L}]+)*$/u.test(v)) {
      return { specialtyInvalidChars: true };
    }
    return null;
  };
}

/** Teléfono: sin letras; solo dígitos y + ( ) - espacio. */
function doctorPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString();
    if (!v.trim()) {
      return null;
    }
    if (/\p{L}/u.test(v)) {
      return { phoneHasLetters: true };
    }
    if (!/^\+?[\d\s().-]+$/.test(v.trim())) {
      return { phoneInvalidChars: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-doctor-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatInputModule, TranslatePipe],
  templateUrl: './doctor-form.html',
  styleUrls: ['./doctor-form.css']
})
export class DoctorFormComponent implements OnChanges {
  @Input() doctor: Doctor | null = null;
  @Output() saved = new EventEmitter<Doctor>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  institutionEmailDomain: string = '';
  /** True tras intentar guardar con el formulario inválido (mensaje resumen). */
  invalidSubmitAttempt = false;
  /** Error devuelto por el API (clave i18n). */
  apiErrorKey: string | null = null;
  /** Guardando en servidor (evita doble envío). */
  submitInProgress = false;

  constructor(private fb: FormBuilder, private organizationStore: OrganizationStore) {
    // Get organizationId from store (patrón de relatives)
    const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
    // Get institution email domain for automatic email generation
    this.institutionEmailDomain = this.organizationStore.getInstitutionEmailDomain();
    
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      age: [null, [Validators.required, Validators.min(DOCTOR_AGE_MIN), Validators.max(DOCTOR_AGE_MAX)]],
      email: ['', [Validators.required, Validators.email]],
      specialty: ['', [Validators.required, specialtyLettersOnlyValidator()]],
      phoneNumber: ['', [Validators.required, doctorPhoneValidator()]],
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)]],
      organizationId: [organizationId] // Get from store (patrón de relatives)
    });

    // Generate email automatically when firstName or lastName changes (only for new doctors)
    this.form.get('firstName')?.valueChanges.subscribe(() => {
      if (!this.doctor) {
        this.generateInstitutionalEmail();
      }
    });

    this.form.get('lastName')?.valueChanges.subscribe(() => {
      if (!this.doctor) {
        this.generateInstitutionalEmail();
      }
    });
  }

  /**
   * Genera automáticamente el correo institucional basado en el nombre y apellido del doctor.
   * Formato: nombre.apellido@dominio-institucional
   */
  private generateInstitutionalEmail(): void {
    if (!this.institutionEmailDomain) {
      return; // No hay dominio institucional configurado
    }

    const firstName = this.form.get('firstName')?.value?.toLowerCase().trim() || '';
    const lastName = this.form.get('lastName')?.value?.toLowerCase().trim() || '';
    const currentEmail = this.form.get('email')?.value || '';

    // Solo generar el email si hay nombre y apellido, y el email actual no contiene el dominio institucional
    if (firstName && lastName) {
      // Si el usuario ya escribió un email completo que contiene el dominio, no lo sobrescribir
      if (currentEmail && currentEmail.includes('@') && !currentEmail.endsWith(this.institutionEmailDomain)) {
        return; // El usuario está escribiendo un email diferente
      }

      // Generar email: nombre.apellido@dominio-institucional
      const normalizedFirstName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remover acentos
      const normalizedLastName = lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remover acentos
      const generatedEmail = `${normalizedFirstName}.${normalizedLastName}${this.institutionEmailDomain}`;

      // Solo actualizar si el email actual está vacío o es el generado anteriormente
      if (!currentEmail || currentEmail === this.form.get('email')?.value) {
        this.form.patchValue({ email: generatedEmail }, { emitEvent: false });
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const doctorChange = changes['doctor'] as SimpleChange | undefined;
    if (!doctorChange) {
      return;
    }

    this.institutionEmailDomain = this.organizationStore.getInstitutionEmailDomain();

    if (this.doctor) {
      this.invalidSubmitAttempt = false;
      this.apiErrorKey = null;
      this.form.patchValue({
        firstName: this.doctor.firstName,
        lastName: this.doctor.lastName,
        age: this.doctor.age,
        email: this.doctor.email,
        specialty: this.doctor.specialty,
        phoneNumber: this.doctor.phoneNumber,
        imageUrl: this.doctor.imageUrl,
        organizationId: this.doctor.organizationId
      });
      return;
    }

    // Modo alta (doctor == null): solo vaciar el formulario al abrir alta nueva, no en cada
    // re-notificación del mismo null (p. ej. tras 409), que antes borraba los datos del usuario.
    const prev = doctorChange.previousValue;
    const enteringAddFromEdit = prev != null && prev !== undefined;
    const firstOpen = doctorChange.isFirstChange();

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

    // Get organizationId from store at submit time to ensure it's always correct
    // Patrón de relatives: userId → organizationId (a través del store)
    const organizationId = this.organizationStore.getCurrentOrganizationId();
    if (!organizationId || organizationId === 0) {
      console.error('Cannot create/update doctor: No user selected or invalid organizationId');
      return;
    }

    // Ensure email has the institutional domain if it doesn't already have one
    let email = this.form.value.email!.trim();
    if (this.institutionEmailDomain && email) {
      // Si el email no contiene @, significa que solo escribió la parte local, agregar el dominio
      if (!email.includes('@')) {
        email = `${email}${this.institutionEmailDomain}`;
      }
      // Si el email contiene @ pero no termina con el dominio institucional, 
      // se respeta el email que el usuario escribió (puede ser un email personal o de otra institución)
    }

    const doctor = new Doctor({
      id: this.doctor ? this.doctor.id : 0,
      firstName: this.form.value.firstName!,
      lastName: this.form.value.lastName!,
      age: Number(this.form.value.age),
      email: email,
      specialty: this.form.value.specialty!,
      phoneNumber: this.form.value.phoneNumber!,
      imageUrl: this.form.value.imageUrl || 'https://via.placeholder.com/150x150/0C7BB5/FFFFFF?text=Dr',
      organizationId: organizationId // Use from store, not form value
    });

    const request$ = this.doctor
      ? this.organizationStore.updateDoctor(doctor)
      : this.organizationStore.addDoctor(doctor);

    this.submitInProgress = true;
    request$.pipe(finalize(() => (this.submitInProgress = false))).subscribe({
      next: savedDoctor => {
        this.apiErrorKey = null;
        this.saved.emit(savedDoctor);
      },
      error: (err: unknown) => {
        this.apiErrorKey = this.mapServerDoctorError(err);
      }
    });
  }

  /** Mapea códigos estables del backend (409) a claves i18n. */
  private mapServerDoctorError(err: unknown): string {
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
      haystack.includes('MEDITRACK_DOCTOR_DUPLICATE_EMAIL') ||
      haystack.includes('MEDITRACK_DOCTOR_DUPLICATE_FULL_NAME')
    ) {
      return 'doctor.errors.duplicateRegistration';
    }
    return 'doctor.errors.saveFailed';
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
